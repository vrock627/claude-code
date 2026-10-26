// Black Tide — top-level game state machine. Pure C# (no UnityEngine).
// Owns the run, the world map, the active battle, and port actions.
using System;
using System.Collections.Generic;

namespace BlackTide.Core
{
    public sealed class Game
    {
        public Screen screen = Screen.Title;
        public Run run;
        public Battle battle;
        public MessagePopup message;
        public List<MapNode> map = new List<MapNode>();

        private readonly Random rng;
        public Game(int? seed = null) { rng = seed.HasValue ? new Random(seed.Value) : new Random(); }

        static double Clamp(double v, double lo, double hi) => v < lo ? lo : (v > hi ? hi : v);
        double Rand(double a, double b) => a + rng.NextDouble() * (b - a);
        int RandInt(int a, int b) => a + rng.Next(b - a + 1);
        T Choice<T>(IList<T> a) => a[rng.Next(a.Count)];

        // ---- new game ----
        public void NewGame(string captain)
        {
            var crew = new List<Crew>
            {
                MakeCrew(3, 0), MakeCrew(2, 0), MakeCrew(1, 2), MakeCrew(1, 0), MakeCrew(1, 1),
            };
            run = new Run
            {
                captain = captain, shipClass = "sloop", areas = Areas.Fresh(), crew = crew,
                gold = Tuning.StartGold, supplies = Tuning.StartSupplies, notoriety = 0, legs = 0, currentNode = 0,
            };
            map = MakeMap();
            battle = null; message = null;
            screen = Screen.Map;
        }

        Crew MakeCrew(double gunnery, double melee)
        {
            string name = Choice(Database.FirstNames);
            if (rng.NextDouble() < 0.5) name += " " + Choice(Database.Nicknames);
            return new Crew
            {
                name = name,
                gunnery = gunnery + RandInt(0, 1),
                sailing = RandInt(0, 2),
                repair = RandInt(0, 2),
                melee = melee + RandInt(0, 1),
                hp = 100, maxHp = 100,
            };
        }

        List<MapNode> MakeMap() => new List<MapNode>
        {
            new MapNode { id = 0, x = 130, y = 300, type = "start", name = "Tortuga Cove", links = new List<int>{1,2}, revealed = true },
            new MapNode { id = 1, x = 360, y = 180, type = "enemy", enemy = "merchant", name = "Open Water", links = new List<int>{0,3}, revealed = true },
            new MapNode { id = 2, x = 360, y = 440, type = "sea", name = "Reef Shallows", links = new List<int>{0,3,4}, revealed = true },
            new MapNode { id = 3, x = 600, y = 260, type = "enemy", enemy = "cutter", name = "Trade Lane", links = new List<int>{1,2,5} },
            new MapNode { id = 4, x = 600, y = 480, type = "port", name = "Port Royal", links = new List<int>{2,5} },
            new MapNode { id = 5, x = 820, y = 360, type = "port", name = "Nassau", links = new List<int>{3,4} },
        };
        public MapNode NodeById(int id) => map.Find(n => n.id == id);

        // ---- sailing ----
        public bool CanSail(int id)
        {
            var cur = NodeById(run.currentNode);
            return cur != null && cur.links.Contains(id);
        }
        public void SailTo(int id)
        {
            if (!CanSail(id)) return;
            run.legs++;
            run.notoriety = Math.Max(0, run.notoriety - Tuning.NotorietyDecayPerLeg);
            if (run.supplies > 0) run.supplies = Math.Max(0, run.supplies - Tuning.SupplyPerLeg);
            else if (run.crew.Count > 1) run.crew.RemoveAt(run.crew.Count - 1);   // starvation
            HealCrewOverLeg();
            run.currentNode = id;
            var n = NodeById(id);
            n.revealed = true;
            foreach (var l in n.links) { var o = NodeById(l); if (o != null) o.revealed = true; }

            if (n.type == "enemy") StartBattle(n);
            else if (n.type == "port") screen = Screen.Port;
            else { message = new MessagePopup { title = n.name, lines = { "Calm seas. Nothing but salt and horizon." } }; screen = Screen.Message; }
        }
        void HealCrewOverLeg()
        {
            double best = 0; foreach (var c in run.crew) if (c.repair > best) best = c.repair; // (slice: repair stands in for medicine)
            double heal = Tuning.HealBase + best * Tuning.HealPerMedicine;
            foreach (var c in run.crew) if (c.hp < c.maxHp) c.hp = Clamp(c.hp + heal, 0, c.maxHp);
        }
        public void DismissMessage() { message = null; screen = Screen.Map; }

        // ---- notoriety scaling ----
        public EnemyTemplate ScaleEnemy(EnemyTemplate t)
        {
            int n = run.notoriety;
            int tierIdx = Database.ShipTierUp(t.ShipClass, n / Tuning.NotorShipEvery);
            string cls = Database.ShipLadder[tierIdx];
            return new EnemyTemplate
            {
                Key = t.Key, Faction = t.Faction, Aggression = t.Aggression, ShipClass = cls,
                Name = (t.Faction == "navy" ? "Navy " : "") + Database.Ships[cls].Name,
                Crew = Math.Max(1, (int)Math.Round(t.Crew * (1 + n * Tuning.NotorCrewK))),
                Gunnery = t.Gunnery + n / Tuning.NotorGunneryEvery,
                Gold = (int)Math.Round(t.Gold * (1 + n * Tuning.NotorGoldK)),
                Supplies = t.Supplies,
            };
        }

        // ---- battle setup ----
        void StartBattle(MapNode node)
        {
            var tmpl = ScaleEnemy(Database.Enemies[node.enemy]);
            double playerGun = 1; foreach (var c in run.crew) playerGun += c.gunnery; playerGun /= Math.Max(1, run.crew.Count);
            var player = MakeBattleShip(run.shipClass, true, run.areas, run.crew.Count, playerGun);
            var enemy = MakeBattleShip(tmpl.ShipClass, false, Areas.Fresh(), tmpl.Crew, tmpl.Gunnery);
            enemy.aggression = tmpl.Aggression;

            battle = new Battle(run, rng) { player = player, enemy = enemy, tmpl = tmpl };
            battle.currentNode = node.id;
            AssignDefaultStations();
            screen = Screen.Battle;
        }
        BattleShip MakeBattleShip(string shipKey, bool isPlayer, Areas areas, int crewCount, double gunnery)
        {
            var sc = Database.Ships[shipKey];
            var s = new BattleShip { sc = sc, isPlayer = isPlayer, areas = areas, crew = crewCount, gunnery = gunnery };
            int guns = sc.GunsPerSide * 2;   // a full battery; no sides in the station model
            for (int id = 0; id < guns; id++)
                s.cannons.Add(new Cannon { id = id, reload = Rand(0, Tuning.ReloadBase), reloadMax = Tuning.ReloadBase, loaded = false });
            return s;
        }
        // Post the crew sensibly at the start of a fight: the best gunners to the guns
        // (enough hands to work the battery), the rest spread over sails / pumps / repair.
        void AssignDefaultStations()
        {
            var sorted = new List<Crew>(run.crew);
            sorted.Sort((a, b) => b.gunnery.CompareTo(a.gunnery));
            int cannons = run.Ship.GunsPerSide * 2;
            int gunsWanted = Math.Max(1, (int)Math.Ceiling(cannons / (double)Tuning.CannonsPerGunner));
            gunsWanted = Math.Min(gunsWanted, Math.Max(1, sorted.Count - 2));   // leave a few for the ship
            var rotate = new[] { Station.Sails, Station.Pumps, Station.Repair };
            int r = 0;
            for (int i = 0; i < sorted.Count; i++)
                sorted[i].station = i < gunsWanted ? Station.Guns : rotate[r++ % rotate.Length];
        }

        public void FinishBattle()
        {
            var o = battle?.outcome;
            var node = NodeById(battle.currentNode);
            if (node != null && node.type == "enemy") node.type = "sea";
            bool dead = o != null && o.kind == "lost";
            battle = null;
            screen = dead ? Screen.GameOver : Screen.Map;
        }
        public void TakePrize()
        {
            var cls = battle?.outcome?.prizeClass;
            if (cls != null) ChangeShip(cls);
            FinishBattle();
        }

        // ---- ships / drydock ----
        public void ChangeShip(string key)
        {
            run.shipClass = key;
            run.areas = Areas.Fresh();
            int cap = Database.Ships[key].CrewCap;
            while (run.crew.Count > cap) run.crew.RemoveAt(run.crew.Count - 1);
        }
        public int ShipBuyNet(string key)
        {
            var sc = Database.Ships[key];
            var cur = Database.Ships[run.shipClass];
            return Math.Max((int)Math.Round(sc.Cost * 0.25), sc.Cost - cur.SellValue);
        }
        public bool CanBuyShip(string key)
        {
            if (key == run.shipClass) return false;
            var sc = Database.Ships[key];
            return run.gold >= ShipBuyNet(key) && run.crew.Count <= sc.CrewCap;
        }
        public void BuyShip(string key)
        {
            if (!CanBuyShip(key)) return;
            run.gold -= ShipBuyNet(key);
            ChangeShip(key);
        }

        // ---- port ----
        public int RepairCost()
        {
            double cost = 0;
            foreach (var k in Database.Areas)
            {
                double miss = Tuning.AreaMax - run.areas.Get(k);
                cost += miss * (k == "hull" ? Database.RepairHullPerPoint : Database.RepairPerPoint);
            }
            return (int)Math.Round(cost);
        }
        public void RepairAll()
        {
            int c = RepairCost();
            if (run.gold < c) return;
            run.gold -= c; run.areas = Areas.Fresh();
            foreach (var cr in run.crew) cr.repair = Math.Min(Tuning.SkillMax, cr.repair + 0.4);
        }
        public bool CanRecruit() => run.gold >= Database.RecruitCost && run.crew.Count < run.Ship.CrewCap;
        public void Recruit()
        {
            if (!CanRecruit()) return;
            run.gold -= Database.RecruitCost;
            run.crew.Add(MakeCrew(RandInt(0, 2), RandInt(0, 2)));
        }
        public bool CanBuySupplies() => run.gold >= Database.SupplyCost * 5;
        public void BuySupplies()
        {
            if (!CanBuySupplies()) return;
            run.gold -= Database.SupplyCost * 5; run.supplies += 5;
        }
        public bool CanRetire() => run.gold >= Tuning.RetireGold;

        // ---- persistence (DTO the Unity layer serialises with JsonUtility) ----
        public Run SaveState() => run;
        public void LoadState(Run r)
        {
            run = r;
            map = MakeMap();
            // reveal everything adjacent to where they are
            var n = NodeById(run.currentNode); if (n != null) { n.revealed = true; foreach (var l in n.links) { var o = NodeById(l); if (o != null) o.revealed = true; } }
            screen = Screen.Map;
        }
    }
}
