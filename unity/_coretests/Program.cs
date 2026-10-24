// Headless validation of BlackTide.Core (compiles the Core UnityEngine-free and
// exercises data invariants + the battle/economy sim). Run: dotnet run.
using System;
using System.Collections.Generic;
using BlackTide.Core;

static class Tests
{
    static readonly List<string> Fail = new();
    static void Check(bool cond, string msg) { if (!cond) Fail.Add(msg); }

    static int Main()
    {
        // ---- data: ship ladder ----
        Check(Database.ShipLadder.Length == Database.Ships.Count, "ladder lists every ship");
        Check(Database.Ships["sloop"].Cost == 0, "sloop is free");
        int prevTier = -1, prevGuns = 0, prevCap = 0;
        foreach (var k in Database.ShipLadder)
        {
            var sc = Database.Ships[k];
            Check(sc.Tier > prevTier, "ladder tier-ordered");
            Check(sc.GunsPerSide >= prevGuns, "guns non-decreasing up the ladder");
            Check(sc.CrewCap >= prevCap, "crew cap non-decreasing up the ladder");
            Check(sc.SellValue < sc.Cost || sc.Cost == 0, k + ": sellValue below cost");
            prevTier = sc.Tier; prevGuns = sc.GunsPerSide; prevCap = sc.CrewCap;
        }

        // ---- data: shots / areas ----
        Check(Array.IndexOf(Database.Areas, "hull") >= 0, "hull area exists");
        Check(Database.Shots["round"].Bias.ContainsKey("hull"), "round favours hull");
        Check(Database.Shots["chain"].Bias.ContainsKey("masts"), "chain favours masts");
        Check(Database.Shots["grape"].Bias.ContainsKey("deck"), "grape favours deck");

        // ---- new game ----
        var g = new Game(seed: 1);
        g.NewGame("privateer");
        Check(g.run.crew.Count == Tuning.StartCrew, "start crew count");
        Check(g.run.shipClass == "sloop", "start ship is sloop");
        Check(g.screen == Screen.Map, "new game lands on the map");

        // ---- notoriety scaling is monotonic ----
        g.run.notoriety = 0;   var lo = g.ScaleEnemy(Database.Enemies["merchant"]);
        g.run.notoriety = 120; var hi = g.ScaleEnemy(Database.Enemies["merchant"]);
        Check(hi.Crew > lo.Crew, "notoriety adds enemy crew");
        Check(hi.Gunnery >= lo.Gunnery, "notoriety never lowers gunnery");
        Check(Database.Ships[hi.ShipClass].Tier > Database.Ships[lo.ShipClass].Tier, "notoriety upgrades the enemy hull");
        g.run.notoriety = 0;

        // ---- firing: a bearing, manned, loaded broadside damages the enemy; unmanned never fires ----
        g.SailTo(1);   // merchant battle
        Check(g.screen == Screen.Battle && g.battle != null, "sailing to an enemy starts a battle");
        var b = g.battle; var p = b.player; var e = b.enemy;
        p.heading = 0;                       // facing east → port beam points north (−y)
        e.x = p.x; e.y = p.y - 150;          // enemy on the port beam, in range
        b.paused = false; b.shot = "round"; b.target = "hull";
        // make an unmanned port cannon and watch it stay dark
        var unmanned = p.cannons.Find(c => c.side == "port");
        unmanned.manned = false; unmanned.loaded = false;
        for (int i = 0; i < 300; i++) b.Update(1.0 / 60);
        Check(!unmanned.loaded, "an unmanned cannon never loads/fires");
        // man + load the rest of the port battery and fire a few volleys
        double beforeHull = e.areas.hull;
        bool damaged = false;
        for (int volley = 0; volley < 6 && !damaged; volley++)
        {
            foreach (var c in p.cannons) if (c.side == "port" && c != unmanned) { c.manned = true; c.gunnerSkill = 6; c.loaded = true; }
            e.x = p.x; e.y = p.y - 150; p.heading = 0;   // keep the geometry
            b.FirePlayer();
            if (e.areas.hull < beforeHull) damaged = true;
        }
        Check(damaged, "pressing fire on a bearing loaded side damages the enemy");

        // ---- flooding → sink → outcome + rewards ----
        int goldBefore = g.run.gold, notorBefore = g.run.notoriety;
        e.areas.hull = 0;
        b.Update(0.2);
        Check(b.outcome != null && b.outcome.kind == "sunk", "a holed hull floods and sinks the enemy");
        Check(g.run.gold > goldBefore, "sinking pays gold");
        Check(g.run.notoriety > notorBefore, "a win raises notoriety");
        g.FinishBattle();
        Check(g.screen == Screen.Map, "finishing a won battle returns to the map");

        // ---- drydock: buy a bigger hull (trade-in) ----
        g.run.gold = 3000;
        Check(g.ShipBuyNet("brig") == 220 - 60, "brig net = cost − sloop trade-in");
        Check(g.CanBuyShip("brig"), "can afford a brig");
        g.BuyShip("brig");
        Check(g.run.shipClass == "brig", "buying swaps your hull");
        Check(g.run.gold == 3000 - 160, "buying spends the net price");

        // ---- capture a bigger hull → prize offered ----
        var g2 = new Game(seed: 7);
        g2.NewGame("buccaneer");
        g2.run.notoriety = 0;
        g2.SailTo(1);                 // merchant = brig (tier 1) vs our sloop (tier 0)
        var b2 = g2.battle;
        b2.enemy.x = b2.player.x + 30; b2.enemy.y = b2.player.y;   // alongside
        b2.enemy.crew = 1;
        b2.TryBoard();
        for (int i = 0; i < 400 && b2.outcome == null; i++) b2.Update(0.1);
        Check(b2.outcome != null && b2.outcome.kind == "captured", "boarding a beaten crew captures the ship");
        Check(b2.outcome.prizeClass == "brig", "capturing a bigger hull offers it as a prize");
        g2.TakePrize();
        Check(g2.run.shipClass == "brig", "taking the prize swaps you to her hull");

        // ---- report ----
        if (Fail.Count > 0)
        {
            Console.Error.WriteLine("CORE TESTS FAILED (" + Fail.Count + "):");
            foreach (var f in Fail) Console.Error.WriteLine("  x " + f);
            return 1;
        }
        Console.WriteLine("Black Tide core OK — " + Database.Ships.Count + " ships, "
            + Database.Shots.Count + " shot types, " + Database.Enemies.Count + " enemies; "
            + "data + battle + economy invariants hold (UnityEngine-free).");
        return 0;
    }
}
