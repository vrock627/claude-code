// Black Tide — real-time naval battle simulation. Pure C# (no UnityEngine),
// ported from pirates/game.js (updateBattle / fireSide / updateBoarding / endBattle).
using System;
using System.Collections.Generic;

namespace BlackTide.Core
{
    public sealed class Boarding
    {
        public double pStr, eStr;
        public double eCasualty, tick;
        public bool done;
    }

    public sealed class Battle
    {
        public BattleShip player, enemy;
        public EnemyTemplate tmpl;      // scaled template (rewards / name)
        public double windDir;
        public bool paused;
        public string shot = "round";
        public string target = "hull";
        public readonly List<string> log = new List<string>();
        public Outcome outcome;
        public double time;
        public int currentNode;         // map node this fight resolves (set by Game)
        public Boarding boarding;
        public string flash;
        public double flashT;

        // per-frame steering input (set by the presentation layer)
        public bool turnLeft, turnRight;

        private readonly Run run;
        private readonly Random rng;

        public Battle(Run run, Random rng) { this.run = run; this.rng = rng; }

        // ---- helpers ----
        static double Norm(double a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
        static double Clamp(double v, double lo, double hi) => v < lo ? lo : (v > hi ? hi : v);
        static double Dist(BattleShip a, BattleShip b) => Math.Sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
        public int OperationalPerSide(BattleShip s) => Math.Max(0, (int)Math.Ceiling(s.sc.GunsPerSide * s.areas.guns / Tuning.AreaMax));
        bool CannonOnline(Cannon c, BattleShip s) => c.slot < OperationalPerSide(s);

        double WindFactor(double heading)
        {
            double c = Math.Cos(Norm(heading - windDir));
            return Tuning.WindMinFactor + (Tuning.WindMaxFactor - Tuning.WindMinFactor) * (c + 1) / 2;
        }
        double ShipMaxSpeed(BattleShip s, double sailEff)
        {
            double mast = s.areas.masts / Tuning.AreaMax;
            double mult = 1;
            if (s.isPlayer && run.captain != null && Database.Captains.TryGetValue(run.captain, out var p)) mult *= p.SpeedMult;
            return s.sc.MaxSpeed * (0.35 + 0.65 * mast) * WindFactor(s.heading) * sailEff * mult;
        }
        double CannonReload(Cannon cn, bool isPlayer)
        {
            double mult = 1;
            if (isPlayer && run.captain != null && Database.Captains.TryGetValue(run.captain, out var p)) mult = p.ReloadMult;
            return (Tuning.ReloadBase * mult) / (0.6 + Tuning.GunnerReloadK * cn.gunnerSkill);
        }
        // crew-count driven effectiveness (slice: no per-station assignment UI yet)
        double HandsEff() => Clamp(run.crew.Count / (double)Math.Max(1, player.sc.CrewIdeal), 0.4, 1.5);
        int CrewAlive() => run.crew.Count;

        public void TogglePause() => paused = !paused;
        public void AdjustSail(double d) { player.sailLevel = Clamp(player.sailLevel + d, 0, 1); }
        public void SetShot(string s) { if (Database.Shots.ContainsKey(s)) shot = s; }
        public void SetTarget(string a) { target = a; }

        // ---- the loop ----
        public void Update(double dt)
        {
            if (outcome != null) return;
            if (boarding != null) { UpdateBoarding(dt); return; }
            if (paused) return;
            time += dt;
            var p = player; var e = enemy;

            // player movement
            double rudder = p.areas.rudder / Tuning.AreaMax;
            double turn = p.sc.TurnRate * (0.5 + 0.5 * HandsEff()) * (0.3 + 0.7 * rudder);
            if (turnLeft) p.heading = Norm(p.heading - turn * dt);
            if (turnRight) p.heading = Norm(p.heading + turn * dt);
            double sailEffP = 0.55 + 0.45 * HandsEff();
            StepShip(p, ShipMaxSpeed(p, sailEffP) * p.sailLevel, dt);
            UpdateFlooding(p, HandsEff() * Tuning.PumpRate, dt);

            TickCannons(p, dt);

            // enemy
            if (!e.surrendered) UpdateEnemyAI(e, p, dt);
            else StepShip(e, ShipMaxSpeed(e, 0.5) * 0.3, dt);
            UpdateFlooding(e, Tuning.PumpRate * 0.5, dt);

            if (!e.surrendered && !e.sunk && (e.areas.hull <= Tuning.EnemyHullSurrender || e.crew <= Tuning.EnemyCrewSurrender))
            {
                e.surrendered = true;
                Log("The enemy strikes her colours!");
            }

            if (e.water >= Tuning.FloodSink || e.areas.hull <= 0) { e.sunk = true; EndBattle("sunk"); return; }
            if (p.water >= Tuning.FloodSink || p.areas.hull <= 0) { EndBattle("lost"); return; }
            if (CrewAlive() <= 0) { EndBattle("lost"); return; }
            if (flashT > 0) flashT -= dt;
        }

        void StepShip(BattleShip s, double targetSpeed, double dt)
        {
            targetSpeed = Math.Max(0, targetSpeed);
            if (s.speed < targetSpeed) s.speed = Math.Min(targetSpeed, s.speed + Tuning.Accel * dt);
            else s.speed = Math.Max(targetSpeed, s.speed - (s.speed - targetSpeed) * dt * 1.5);
            s.x += Math.Cos(s.heading) * s.speed * dt;
            s.y += Math.Sin(s.heading) * s.speed * dt;
            const double m = 30;
            s.x = Clamp(s.x, m, Tuning.ArenaW - m);
            s.y = Clamp(s.y, m, Tuning.ArenaH - m);
        }

        void UpdateFlooding(BattleShip s, double pump, double dt)
        {
            double breach = Tuning.AreaMax - s.areas.hull;
            double rate = breach * Tuning.FloodGain;
            s.water = Clamp(s.water + (rate - pump) * dt, 0, Tuning.FloodSink);
        }

        void TickCannons(BattleShip s, double dt)
        {
            foreach (var cn in s.cannons)
            {
                if (!cn.manned || !CannonOnline(cn, s)) { cn.loaded = false; continue; }
                if (!cn.loaded) { cn.reload -= dt; if (cn.reload <= 0) { cn.reload = 0; cn.loaded = true; } }
            }
        }

        public string BearingSide(BattleShip a, BattleShip b)
        {
            double ang = Norm(Math.Atan2(b.y - a.y, b.x - a.x) - a.heading);
            double arc = Tuning.GunArcDeg * Math.PI / 180;
            if (Math.Abs(Norm(ang + Math.PI / 2)) < arc) return "port";
            if (Math.Abs(Norm(ang - Math.PI / 2)) < arc) return "star";
            return null;
        }
        public int SideLoaded(BattleShip s, string side)
        {
            int n = 0;
            foreach (var cn in s.cannons) if (cn.side == side && cn.loaded && cn.manned && CannonOnline(cn, s)) n++;
            return n;
        }

        // player fire order (never automatic)
        public void FirePlayer()
        {
            if (outcome != null || boarding != null || enemy.sunk) return;
            string side = BearingSide(player, enemy);
            if (side == null) { flash = "No guns bear — turn to bring a broadside about!"; flashT = 1.6; return; }
            if (SideLoaded(player, side) == 0) { flash = "No loaded guns on the " + side + " side."; flashT = 1.4; return; }
            FireSide(player, enemy, side);
        }

        void FireSide(BattleShip attacker, BattleShip defender, string side)
        {
            var shotKind = attacker.isPlayer ? Database.Shots[shot] : Database.Shots["round"];
            string targetArea = attacker.isPlayer ? target : "hull";
            double range = Dist(attacker, defender);
            bool inRange = range <= attacker.sc.GunRange;
            bool bears = BearingSide(attacker, defender) == side;
            double rangeFrac = Clamp(range / attacker.sc.GunRange, 0, 1);
            double motionFrac = Clamp(defender.speed / defender.sc.MaxSpeed, 0, 1);
            int hits = 0, fired = 0;
            foreach (var cn in attacker.cannons)
            {
                if (cn.side != side || !cn.loaded || !cn.manned || !CannonOnline(cn, attacker)) continue;
                fired++;
                cn.loaded = false;
                cn.reloadMax = CannonReload(cn, attacker.isPlayer);
                cn.reload = cn.reloadMax;
                if (!bears || !inRange) continue;
                double acc = Tuning.AccuracyBase * (1 - rangeFrac * Tuning.AccuracyRangeFalloff)
                    * (1 - motionFrac * Tuning.AccuracyMotionPenalty) * (1 + Tuning.GunnerAccK * cn.gunnerSkill);
                if (rng.NextDouble() < Clamp(acc, 0.05, 0.96)) hits++;
            }
            if (fired == 0) return;
            string who = attacker.isPlayer ? "Your" : "Enemy";
            if (hits > 0)
            {
                double bias = shotKind.Bias.TryGetValue(targetArea, out var bv) ? bv : 0.7;
                double dmg = hits * shotKind.Base * bias;
                defender.areas.Set(targetArea, Math.Max(0, defender.areas.Get(targetArea) - dmg));
                double cas = shotKind.Casualty * (targetArea == "deck" ? 1.5 : 1) * hits * 0.5;
                if (rng.NextDouble() < cas) ApplyCasualty(defender);
                Log(who + " " + side + " battery: " + hits + "/" + fired + " into the " + targetArea);
            }
            else Log(who + " " + side + " battery: " + fired + " fired, " + (bears && inRange ? "all missed" : "none bore"));
        }

        void ApplyCasualty(BattleShip defender)
        {
            if (defender.isPlayer) WoundRandomCrew(Tuning.WoundGrape);
            else defender.crew = Math.Max(0, defender.crew - 1);
        }
        void WoundRandomCrew(double amount)
        {
            int guard = 0;
            while (amount > 0 && run.crew.Count > 0 && guard++ < 200)
            {
                var c = run.crew[rng.Next(run.crew.Count)];
                double d = Math.Min(amount, c.hp);
                c.hp -= d; amount -= d;
                if (c.hp <= 0) run.crew.Remove(c);
            }
        }

        void UpdateEnemyAI(BattleShip e, BattleShip p, double dt)
        {
            double range = Dist(e, p);
            double toP = Norm(Math.Atan2(p.y - e.y, p.x - e.x) - e.heading);
            double preferred = e.sc.GunRange * 0.62;
            double desiredRel = range > preferred * 1.25 ? toP : (toP > 0 ? toP - Math.PI / 2 : toP + Math.PI / 2);
            double rudder = e.areas.rudder / Tuning.AreaMax;
            double turn = e.sc.TurnRate * (0.4 + 0.6 * rudder);
            if (desiredRel > 0.05) e.heading = Norm(e.heading + Math.Min(turn * dt, desiredRel));
            else if (desiredRel < -0.05) e.heading = Norm(e.heading - Math.Min(turn * dt, -desiredRel));
            StepShip(e, ShipMaxSpeed(e, 0.9) * (0.5 + 0.5 * e.aggression), dt);
            TickCannons(e, dt);
            if (range <= e.sc.GunRange)
            {
                string side = BearingSide(e, p);
                if (side != null)
                {
                    int ops = OperationalPerSide(e), loaded = SideLoaded(e, side);
                    if (loaded > 0 && loaded >= (int)Math.Ceiling(ops / 2.0)) FireSide(e, p, side);
                }
            }
        }

        // ---- boarding ----
        public bool CanBoard() => Dist(player, enemy) <= Tuning.GrappleRange && !enemy.sunk && boarding == null && outcome == null;
        public void TryBoard()
        {
            if (outcome != null || boarding != null || enemy.sunk) return;
            if (Dist(player, enemy) > Tuning.GrappleRange) { flash = "Too far — close to grapple range!"; flashT = 1.5; return; }
            player.speed = 0; enemy.speed = 0;
            double meleeMult = 1;
            if (run.captain != null && Database.Captains.TryGetValue(run.captain, out var p)) meleeMult = p.MeleeMult;
            double pStr = 0;
            foreach (var c in run.crew) pStr += (Tuning.MeleeBase + c.melee) * (0.4 + 0.6 * Clamp(c.hp / Math.Max(1, c.maxHp), 0, 1));
            pStr *= meleeMult;
            double eStr = enemy.crew * (Tuning.MeleeBase + enemy.gunnery) * (enemy.surrendered ? 0.4 : 1);
            boarding = new Boarding { pStr = pStr, eStr = eStr };
            Log("Grapples away! Boarders over the side!");
        }
        void UpdateBoarding(double dt)
        {
            var bd = boarding;
            if (bd.done) return;
            bd.tick += dt;
            if (bd.tick < Tuning.BoardTickSec) return;
            bd.tick = 0;
            double adv = bd.pStr / Math.Max(1, bd.eStr);
            double eLoss = Tuning.BoardLethality * bd.pStr * adv;
            double pLoss = Tuning.BoardLethality * bd.eStr / adv;
            bd.eCasualty += eLoss;
            while (bd.eCasualty >= 1 && enemy.crew > 0) { enemy.crew--; bd.eCasualty -= 1; }
            WoundRandomCrew(pLoss * Tuning.WoundBoardScale);
            if (enemy.crew <= 0) { bd.done = true; EndBattle("captured"); }
            else if (CrewAlive() <= 0) { bd.done = true; EndBattle("lost"); }
        }

        void EndBattle(string kind)
        {
            if (outcome != null) return;
            var o = new Outcome { kind = kind };
            if (kind == "lost")
            {
                o.title = "Your Ship is Lost";
                o.lines.Add("Water over the rail, colours down. The sea takes the rest.");
                outcome = o;
                return;
            }
            if (kind == "captured")
            {
                o.gold = (int)Math.Round(tmpl.Gold * 1.0 + 40);
                o.supplies = tmpl.Supplies + 2;
                o.title = "Prize Taken!";
                o.lines.Add("You storm the deck and take her whole. The hold is yours.");
                if (Database.Ships[tmpl.ShipClass].Tier > Database.Ships[run.shipClass].Tier) o.prizeClass = tmpl.ShipClass;
            }
            else // sunk
            {
                o.gold = (int)Math.Round(tmpl.Gold * Tuning.SinkGoldMult);
                o.supplies = Math.Max(0, tmpl.Supplies - 1);
                o.title = "Enemy Sunk";
                o.lines.Add("She goes down by the bow. You scoop what flotsam you can.");
            }
            run.notoriety = (int)Clamp(run.notoriety + Tuning.NotorPerWin + (tmpl.Faction == "navy" ? Tuning.NotorNavyBonus : 0), 0, 200);
            run.gold += o.gold; run.supplies += o.supplies;
            player.water = 0; run.areas = player.areas;   // bail out; damage persists
            outcome = o;
        }

        void Log(string s) { log.Insert(0, s); if (log.Count > 5) log.RemoveAt(log.Count - 1); }
    }
}
