// Black Tide — runtime + persistent model. Pure C# (no UnityEngine).
// Persistent types carry [System.Serializable] so the Unity layer can round-trip
// them with JsonUtility; they deliberately avoid Dictionary (which it can't serialize).
using System;
using System.Collections.Generic;

namespace BlackTide.Core
{
    // Localized ship condition, 0..100 per area (named fields → JsonUtility-safe).
    [Serializable]
    public class Areas
    {
        public double hull = 100, masts = 100, rudder = 100, guns = 100, deck = 100;

        public double Get(string k) => k switch
        {
            "hull" => hull, "masts" => masts, "rudder" => rudder, "guns" => guns, "deck" => deck, _ => 100
        };
        public void Set(string k, double v)
        {
            switch (k)
            {
                case "hull": hull = v; break;
                case "masts": masts = v; break;
                case "rudder": rudder = v; break;
                case "guns": guns = v; break;
                case "deck": deck = v; break;
            }
        }
        public Areas Clone() => new Areas { hull = hull, masts = masts, rudder = rudder, guns = guns, deck = deck };
        public static Areas Fresh() => new Areas();
    }

    // Where a hand is posted during a battle (FTL-style stations). Transient: it is
    // reset at the start of every fight and never persisted, so it is [NonSerialized].
    public enum Station { Guns, Sails, Pumps, Repair }

    [Serializable]
    public class Crew
    {
        public string name;
        public double gunnery, sailing, repair, melee;
        public double hp = 100, maxHp = 100;

        [NonSerialized] public Station station;   // battle posting (set when a fight begins)
    }

    // The saved run (what persists between ports / across sessions).
    [Serializable]
    public class Run
    {
        public string captain;
        public string shipClass = "sloop";
        public Areas areas = new Areas();
        public List<Crew> crew = new List<Crew>();
        public int gold, supplies, notoriety, legs, currentNode;

        public ShipClass Ship => Database.Ships[shipClass];
    }

    [Serializable]
    public class MapNode
    {
        public int id;
        public double x, y;
        public string type;   // start | sea | enemy | port
        public string name;
        public string enemy;  // enemy template key (for type=="enemy")
        public List<int> links = new List<int>();
        public bool revealed;
    }

    // ---- runtime-only battle types (not serialized) ----
    // A single gun. In the station model there are no port/star sides and no
    // positions: a gun simply reloads (when crewed) and fires when ordered.
    public sealed class Cannon
    {
        public int id;
        public bool loaded;
        public double reload, reloadMax;
    }

    public sealed class BattleShip
    {
        public ShipClass sc;
        public bool isPlayer;
        public Areas areas;
        public double water;
        public int crew;                 // headcount (enemy is modelled as a headcount only)
        public double gunnery = 1;        // enemy gun skill; player guns read live crew skill
        public List<Cannon> cannons = new List<Cannon>();
        public bool surrendered, sunk;
        public double aggression = 0.5;
    }

    public enum Screen { Title, Create, Map, Battle, Outcome, Port, GameOver, Victory, Message }

    public sealed class Outcome
    {
        public string kind;          // captured | sunk | lost
        public string title;
        public List<string> lines = new List<string>();
        public int gold, supplies;
        public string prizeClass;    // non-null → offer to take her hull
    }

    public sealed class MessagePopup
    {
        public string title;
        public List<string> lines = new List<string>();
    }
}
