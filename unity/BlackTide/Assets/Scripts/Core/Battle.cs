// Black Tide — FTL-style station battle. Pure C# (no UnityEngine).
// There are no positions and no manoeuvring: the two ships lie alongside and the
// fight is won by managing the ship. Crew are posted to STATIONS (Guns, Sails,
// Pumps, Repair); the posting drives gun reload/accuracy, evasion, flooding and
// damage-control. Guns reload over time and fire when ordered. You may grapple
// and board to take the ship whole.
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

        private readonly Run run;
        private readonly Random rng;

        public Battle(Run run, Random rng) { this.run = run; this.rng = rng; }

        // ---- helpers ----
        static double Clamp(double v, double lo, double hi) => v < lo ? lo : (v > hi ? hi : v);

        public void TogglePause() => paused = !paused;
        public void SetShot(string s) { if (Database.Shots.ContainsKey(s)) shot = s; }
        public void SetTarget(string a) { target = a; }

        // ---- crew stations ----
        public void AssignStation(Crew c, Station s) { if (c != null) c.station = s; }
        public int CountAt(Station s)
        {
            int n = 0; foreach (var c in run.crew) if (c.hp > 0 && c.station == s) n++; return n;
        }
        double AvgSkill(Station s, Func<Crew, double> sel)
        {
            double sum = 0; int n = 0;
            foreach (var c in run.crew) if (c.hp > 0 && c.station == s) { sum += sel(c); n++; }
            return n == 0 ? 0 : sum / n;
        }

        // ---- gun maths ----
        public int TotalCannons(BattleShip s) => s.cannons.Count;
        public int OperationalCannons(BattleShip s)
            => Math.Max(0, (int)Math.Ceiling(s.cannons.Count * (s.areas.guns / Tuning.AreaMax)));
        int EnemyGunners() => (int)Math.Floor(enemy.crew * 0.6);
        public int CrewedCannons()
            => Math.Min(OperationalCannons(player), Math.Max(0, CountAt(Station.Guns)) * Tuning.CannonsPerGunner);
        int CrewedCannonsEnemy()
            => Math.Min(OperationalCannons(enemy), Math.Max(0, EnemyGunners()) * Tuning.CannonsPerGunner);
        public int LoadedCannons(BattleShip s)
        {
            int op = OperationalCannons(s), n = 0, gun = 0;
            for (int i = 0; i < s.cannons.Count && gun < op; i++) { gun++; if (s.cannons[i].loaded) n++; }
            return n;
        }
        double ReloadTime(bool isPlayer, double avgGun)
        {
            double mult = 1;
            if (isPlayer && run.captain != null && Database.Captains.TryGetValue(run.captain, out var p)) mult = p.ReloadMult;
            return (Tuning.ReloadBase * mult) / (0.6 + Tuning.GunnerReloadK * avgGun);
        }

        // ---- evasion: how often a volley goes wide (rigging + sound masts/rudder) ----
        double EvasionOf(BattleShip s)
        {
            double ev;
            if (s.isPlayer)
            {
                int sailors = CountAt(Station.Sails);
                double avgSail = AvgSkill(Station.Sails, c => c.sailing);
                ev = Tuning.EvasionBase + Tuning.EvasionPerSailor * sailors * (0.6 + 0.12 * avgSail);
                if (run.captain != null && Database.Captains.TryGetValue(run.captain, out var p)) ev *= p.SpeedMult;
            }
            else
            {
                int sailors = (int)Math.Floor(s.crew * 0.2);
                ev = Tuning.EvasionBase + Tuning.EvasionPerSailor * sailors;
            }
            ev *= 0.45 + 0.55 * (s.areas.masts / Tuning.AreaMax);   // shot-away rigging kills the dodge
            ev *= 0.60 + 0.40 * (s.areas.rudder / Tuning.AreaMax);  // a smashed rudder, too
            return Clamp(ev, 0, Tuning.EvasionMax);
        }
        public double PlayerEvasion() => EvasionOf(player);
        public double EnemyEvasion() => EvasionOf(enemy);

        // ---- the loop ----
        public void Update(double dt)
        {
            if (outcome != null) return;
            if (boarding != null) { UpdateBoarding(dt); return; }
            if (paused) return;
            time += dt;
            var p = player; var e = enemy;

            // player guns + damage-control + bilge
            double pAvgGun = AvgSkill(Station.Guns, c => c.gunnery);
            TickCannons(p, CrewedCannons(), dt);
            PlayerRepair(dt);
            double pump = Tuning.PumpRate * Clamp(CountAt(Station.Pumps) * (0.5 + 0.12 * AvgSkill(Station.Pumps, c => c.repair)), 0, 2.2);
            UpdateFlooding(p, pump, dt);

            // enemy
            if (!e.surrendered)
            {
                TickCannons(e, CrewedCannonsEnemy(), dt);
                EnemyMaybeFire();
            }
            UpdateFlooding(e, Tuning.PumpRate * 0.5, dt);

            if (!e.surrendered && !e.sunk && (e.areas.hull <= Tuning.EnemyHullSurrender || e.crew <= Tuning.EnemyCrewSurrender))
            {
                e.surrendered = true;
                Log("The enemy strikes her colours!");
            }

            if (e.water >= Tuning.FloodSink || e.areas.hull <= 0) { e.sunk = true; EndBattle("sunk"); return; }
            if (p.water >= Tuning.FloodSink || p.areas.hull <= 0) { EndBattle("lost"); return; }
            if (run.crew.Count <= 0) { EndBattle("lost"); return; }
            if (flashT > 0) flashT -= dt;
        }

        void UpdateFlooding(BattleShip s, double pump, double dt)
        {
            double breach = Tuning.AreaMax - s.areas.hull;
            double rate = breach * Tuning.FloodGain;
            s.water = Clamp(s.water + (rate - pump) * dt, 0, Tuning.FloodSink);
        }

        // Only the first `crewed` operational guns reload; the rest sit idle for want of hands.
        void TickCannons(BattleShip s, int crewed, double dt)
        {
            for (int i = 0; i < s.cannons.Count; i++)
            {
                var cn = s.cannons[i];
                if (i >= crewed) continue;
                if (!cn.loaded) { cn.reload -= dt; if (cn.reload <= 0) { cn.reload = 0; cn.loaded = true; } }
            }
        }

        // ---- damage-control: posted hands slowly mend their part of the ship ----
        void PlayerRepair(double dt)
        {
            var a = player.areas;
            double sails = RepairPower(Station.Sails, c => c.sailing, dt);
            if (sails > 0) a.masts = Math.Min(Tuning.AreaMax, a.masts + sails);
            double pumpsFix = RepairPower(Station.Pumps, c => c.repair, dt) * 0.6;
            if (pumpsFix > 0) a.hull = Math.Min(Tuning.AreaMax, a.hull + pumpsFix);
            double rep = RepairPower(Station.Repair, c => c.repair, dt);
            if (rep > 0)
            {
                string worst = "rudder"; double wv = a.rudder;
                if (a.guns < wv) { worst = "guns"; wv = a.guns; }
                if (a.deck < wv) { worst = "deck"; wv = a.deck; }
                a.Set(worst, Math.Min(Tuning.AreaMax, wv + rep));
            }
        }
        double RepairPower(Station st, Func<Crew, double> skill, double dt)
        {
            int n = CountAt(st); if (n <= 0) return 0;
            return Tuning.RepairRate * n * (0.5 + 0.12 * AvgSkill(st, skill)) * dt;
        }

        // ---- gunnery ----
        // player fire order (never automatic)
        public void FirePlayer()
        {
            if (outcome != null || boarding != null || enemy.sunk) return;
            int op = OperationalCannons(player);
            if (op <= 0) { flash = "Your guns are dismounted — post hands to Repair!"; flashT = 1.6; return; }
            if (LoadedCannons(player) == 0) { flash = "No guns loaded — the crew are still ramming home."; flashT = 1.5; return; }
            FireVolley(player, enemy, target, shot, AvgSkill(Station.Guns, c => c.gunnery));
        }

        void EnemyMaybeFire()
        {
            var e = enemy;
            int op = OperationalCannons(e); if (op <= 0) return;
            if (LoadedCannons(e) < Math.Max(1, op / 2)) return;
            string area = WeightedEnemyTarget();
            string sk = (e.aggression > 0.7 && run.crew.Count >= 4 && rng.NextDouble() < 0.35) ? "grape" : "round";
            FireVolley(e, player, area, sk, e.gunnery);
        }

        string WeightedEnemyTarget()
        {
            // favour the hull, then the guns, then raking the deck
            double r = rng.NextDouble();
            if (r < 0.40) return "hull";
            if (r < 0.65) return "guns";
            if (r < 0.85) return "deck";
            if (r < 0.95) return "masts";
            return "rudder";
        }

        // Discharge every loaded, operational gun at one area. Returns guns fired.
        int FireVolley(BattleShip atk, BattleShip def, string area, string shotKey, double avgGun)
        {
            var shotKind = Database.Shots.ContainsKey(shotKey) ? Database.Shots[shotKey] : Database.Shots["round"];
            double ev = EvasionOf(def);
            int op = OperationalCannons(atk);
            int fired = 0, hits = 0, gun = 0;
            for (int i = 0; i < atk.cannons.Count && gun < op; i++)
            {
                var cn = atk.cannons[i];
                gun++;
                if (!cn.loaded) continue;
                fired++;
                cn.loaded = false;
                cn.reloadMax = ReloadTime(atk.isPlayer, avgGun);
                cn.reload = cn.reloadMax;
                double acc = Tuning.AccuracyBase * (1 + Tuning.GunnerAccK * avgGun) * (1 - ev);
                if (rng.NextDouble() < Clamp(acc, 0.05, 0.96)) hits++;
            }
            if (fired == 0) return 0;
            string who = atk.isPlayer ? "Your" : "Enemy";
            if (hits > 0)
            {
                double bias = shotKind.Bias.TryGetValue(area, out var bv) ? bv : 0.7;
                double dmg = hits * shotKind.Base * bias;
                def.areas.Set(area, Math.Max(0, def.areas.Get(area) - dmg));
                double cas = shotKind.Casualty * (area == "deck" ? 1.5 : 1) * hits * 0.5;
                if (rng.NextDouble() < cas) ApplyCasualty(def);
                Log(who + " guns: " + hits + "/" + fired + " into the " + area);
            }
            else Log(who + " guns: " + fired + " fired — all wide");
            return fired;
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

        // ---- boarding (ships lie alongside, so grapples are always an option) ----
        public bool CanBoard() => !enemy.sunk && boarding == null && outcome == null;
        public void TryBoard()
        {
            if (outcome != null || boarding != null || enemy.sunk) return;
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
            else if (run.crew.Count <= 0) { bd.done = true; EndBattle("lost"); }
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

        void Log(string s) { log.Insert(0, s); if (log.Count > 6) log.RemoveAt(log.Count - 1); }
    }
}
