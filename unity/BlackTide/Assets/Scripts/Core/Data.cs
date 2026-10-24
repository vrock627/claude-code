// Black Tide — engine-agnostic game data. No UnityEngine here: this whole
// folder compiles and is unit-tested with plain .NET (see unity/_coretests).
using System.Collections.Generic;

namespace BlackTide.Core
{
    // All balance knobs in one place (ported from pirates/data.js TUNING).
    public static class Tuning
    {
        public const int StartGold = 80;
        public const int StartSupplies = 14;
        public const int StartCrew = 5;
        public const int SupplyPerLeg = 2;
        public const int NotorietyDecayPerLeg = 3;

        // Battle plane (world units)
        public const double ArenaW = 1200;
        public const double ArenaH = 760;
        public const double WindMinFactor = 0.45;   // dead into the wind
        public const double WindMaxFactor = 1.35;   // running before the wind
        public const double Accel = 70;

        // Gunnery — cannons are crew-manned; the gunner's skill sets reload + aim.
        public const double ReloadBase = 3.4;
        public const double GunnerReloadK = 0.25;
        public const double GunnerAccK = 0.05;
        public const double GunArcDeg = 40;
        public const double AccuracyBase = 0.62;
        public const double AccuracyRangeFalloff = 0.45;
        public const double AccuracyMotionPenalty = 0.30;
        public const double AreaMax = 100;

        // Damage / flooding
        public const double FloodGain = 0.045;
        public const double PumpRate = 9.0;
        public const double FloodSink = 100;

        // Boarding
        public const double GrappleRange = 70;
        public const double BoardTickSec = 0.6;
        public const double BoardLethality = 0.02;
        public const double WoundBoardScale = 100;
        public const double WoundGrape = 30;
        public const double MeleeBase = 4;

        // Enemy surrender
        public const double EnemyHullSurrender = 28;
        public const int EnemyCrewSurrender = 2;
        public const double SinkGoldMult = 0.45;

        // Economy / progression
        public const int RetireGold = 1500;

        // Notoriety-driven scaling
        public const double NotorCrewK = 0.010;
        public const int NotorGunneryEvery = 45;
        public const int NotorShipEvery = 40;
        public const double NotorGoldK = 0.006;
        public const int NotorPerWin = 6;
        public const int NotorNavyBonus = 4;
        public const int NotorHunted = 60;

        public const double SkillMax = 9;
        public const double HealBase = 9;
        public const double HealPerMedicine = 3;   // (medicine kept minimal in the slice)
    }

    public sealed class ShipClass
    {
        public string Key, Name, Desc;
        public int Tier, Cost, SellValue, GunsPerSide, CrewCap, CrewIdeal;
        public double MaxSpeed, TurnRate, GunRange, Length, Beam;
    }

    public sealed class Area
    {
        public string Key, Label, Effect;
    }

    public sealed class ShotType
    {
        public string Key, Label, Desc;
        public double Base, Casualty;
        public Dictionary<string, double> Bias;
    }

    public sealed class EnemyTemplate
    {
        public string Key, Name, ShipClass, Faction;
        public int Crew, Gold, Supplies;
        public double Gunnery, Aggression;
    }

    public sealed class CaptainPerk
    {
        public string Key, Label, Blurb;
        public double ReloadMult = 1, SpeedMult = 1, MeleeMult = 1;
    }

    // Static content catalogue (ported slice subset of pirates/data.js).
    public static class Database
    {
        public static readonly string[] Areas = { "hull", "masts", "rudder", "guns", "deck" };

        public static readonly Dictionary<string, Area> AreaInfo = new()
        {
            ["hull"]   = new Area { Key = "hull",   Label = "Hull",   Effect = "breach → flooding; reaches 0 and floods → you sink" },
            ["masts"]  = new Area { Key = "masts",  Label = "Masts",  Effect = "shot away → less speed (chain-shot excels)" },
            ["rudder"] = new Area { Key = "rudder", Label = "Rudder", Effect = "smashed → sluggish turning" },
            ["guns"]   = new Area { Key = "guns",   Label = "Guns",   Effect = "dismounted → fewer cannons fire" },
            ["deck"]   = new Area { Key = "deck",   Label = "Deck",   Effect = "raked → crew casualties (grape excels)" },
        };

        public static readonly Dictionary<string, ShotType> Shots = new()
        {
            ["round"] = new ShotType { Key = "round", Label = "Round-shot", Desc = "Hull-breaker. Sinks ships.", Base = 6, Casualty = 0.10, Bias = new() { ["hull"] = 1.6 } },
            ["chain"] = new ShotType { Key = "chain", Label = "Chain-shot", Desc = "Tears rigging. Kills mobility.", Base = 5, Casualty = 0.04, Bias = new() { ["masts"] = 2.2 } },
            ["grape"] = new ShotType { Key = "grape", Label = "Grape-shot", Desc = "Shreds crew on deck.", Base = 5, Casualty = 0.45, Bias = new() { ["deck"] = 1.7 } },
        };

        public static readonly Dictionary<string, ShipClass> Ships = new()
        {
            ["sloop"]   = new ShipClass { Key = "sloop",   Name = "Sloop",   Tier = 0, Cost = 0,    SellValue = 60,  MaxSpeed = 132, TurnRate = 1.55, GunsPerSide = 3,  CrewCap = 10, CrewIdeal = 2, GunRange = 270, Length = 46, Beam = 16, Desc = "Fast and nimble, but thin-hulled." },
            ["brig"]    = new ShipClass { Key = "brig",    Name = "Brig",    Tier = 1, Cost = 220,  SellValue = 110, MaxSpeed = 108, TurnRate = 1.15, GunsPerSide = 5,  CrewCap = 18, CrewIdeal = 3, GunRange = 300, Length = 60, Beam = 20, Desc = "A balanced all-rounder." },
            ["frigate"] = new ShipClass { Key = "frigate", Name = "Frigate", Tier = 2, Cost = 560,  SellValue = 300, MaxSpeed = 92,  TurnRate = 0.85, GunsPerSide = 8,  CrewCap = 26, CrewIdeal = 4, GunRange = 330, Length = 76, Beam = 24, Desc = "A heavy warship." },
            ["galleon"] = new ShipClass { Key = "galleon", Name = "Galleon", Tier = 3, Cost = 1200, SellValue = 650, MaxSpeed = 74,  TurnRate = 0.6,  GunsPerSide = 12, CrewCap = 36, CrewIdeal = 5, GunRange = 350, Length = 96, Beam = 32, Desc = "A floating fortress." },
        };

        // Ladder keys ordered by tier.
        public static readonly string[] ShipLadder = { "sloop", "brig", "frigate", "galleon" };

        public static readonly Dictionary<string, EnemyTemplate> Enemies = new()
        {
            ["merchant"] = new EnemyTemplate { Key = "merchant", Name = "Merchant Brig", ShipClass = "brig",  Faction = "merchants", Crew = 4, Gunnery = 1, Aggression = 0.35, Gold = 120, Supplies = 4 },
            ["cutter"]   = new EnemyTemplate { Key = "cutter",   Name = "Navy Cutter",   ShipClass = "sloop", Faction = "navy",      Crew = 9, Gunnery = 3, Aggression = 0.85, Gold = 90,  Supplies = 2 },
        };

        public static readonly Dictionary<string, CaptainPerk> Captains = new()
        {
            ["privateer"] = new CaptainPerk { Key = "privateer", Label = "Privateer", Blurb = "Trained gun crews. Reloads come quicker.", ReloadMult = 0.85 },
            ["smuggler"]  = new CaptainPerk { Key = "smuggler",  Label = "Smuggler",  Blurb = "Slick rigging. Your ship runs faster.",    SpeedMult = 1.12 },
            ["buccaneer"] = new CaptainPerk { Key = "buccaneer", Label = "Buccaneer", Blurb = "Feared boarder. Your crew hit harder.",    MeleeMult = 1.25 },
        };

        public static readonly string[] FirstNames = { "Anne", "Jack", "Mary", "Edward", "Grace", "Henry", "Bess", "Tom", "Nell", "Will", "Kit", "Rourke", "Diego", "Mei", "Cuffee", "Salim", "Bart", "Jonah" };
        public static readonly string[] Nicknames = { "the Knife", "Blacktooth", "One-Eye", "Saltlung", "Quickhand", "the Gull", "Ironwrist", "Lowtide", "Halfpenny", "Bloodgut", "Longshanks" };

        // Port economy
        public const int RecruitCost = 60;
        public const int SupplyCost = 6;
        public const double RepairPerPoint = 1.4;
        public const double RepairHullPerPoint = 2.0;

        public static int ShipTierUp(string key, int steps)
        {
            int i = System.Array.IndexOf(ShipLadder, key);
            int j = i + steps;
            if (j < 0) j = 0;
            if (j > ShipLadder.Length - 1) j = ShipLadder.Length - 1;
            return j;
        }
    }
}
