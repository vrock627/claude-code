// Black Tide — Unity presentation layer (IMGUI). Renders every screen and feeds
// input to the engine-agnostic BlackTide.Core. All input is read through IMGUI
// events (Event.current) and GUI.Button, so it works whether the project uses the
// old Input Manager or the new Input System package — no UnityEngine.Input calls.
using System.Collections.Generic;
using UnityEngine;
using BlackTide.Core;
using GameScreen = BlackTide.Core.Screen;

namespace BlackTide.App
{
    public sealed class GameHost : MonoBehaviour
    {
        // virtual canvas (letterboxed to the window)
        const float W = 960f, H = 600f;

        Game game;
        Texture2D white;
        readonly HashSet<KeyCode> held = new HashSet<KeyCode>();
        Crew selectedCrew;     // battle: the mate picked up, awaiting a station
        float acc;
        const float STEP = 1f / 60f;
        const string SAVE_KEY = "blackTideSave_v1";

        // palette (matches the browser build's feel)
        static readonly Color SeaDeep = new Color(0.039f, 0.157f, 0.251f);
        static readonly Color Panel = new Color(0.075f, 0.141f, 0.184f);
        static readonly Color PanelLt = new Color(0.114f, 0.208f, 0.263f);
        static readonly Color Ink = new Color(0.04f, 0.09f, 0.13f);
        static readonly Color TextC = new Color(0.949f, 0.918f, 0.839f);
        static readonly Color Dim = new Color(0.624f, 0.690f, 0.741f);
        static readonly Color Hi = new Color(0.957f, 0.843f, 0.478f);
        static readonly Color Gold = new Color(0.902f, 0.706f, 0.133f);
        static readonly Color Green = new Color(0.247f, 0.541f, 0.310f);
        static readonly Color Red = new Color(0.722f, 0.255f, 0.184f);
        static readonly Color Danger = new Color(0.851f, 0.325f, 0.231f);
        static readonly Color Wood = new Color(0.420f, 0.290f, 0.169f);
        static readonly Color Blue = new Color(0.239f, 0.549f, 0.784f);

        void Awake()
        {
            game = new Game();
            white = new Texture2D(1, 1);
            white.SetPixel(0, 0, Color.white);
            white.Apply();
        }

        // ---------------------------------------------------------------- update
        void Update()
        {
            if (game == null) return;
            if (game.screen == GameScreen.Battle && game.battle != null)
            {
                acc += Time.deltaTime;
                if (acc > 0.25f) acc = 0.25f;
                while (acc >= STEP) { game.battle.Update(STEP); acc -= STEP; }
            }
        }

        void HandleKey(KeyCode k)
        {
            if (game.screen == GameScreen.Battle && game.battle != null && game.battle.outcome == null)
            {
                var b = game.battle;
                if (k == KeyCode.Space) b.TogglePause();
                else if (k == KeyCode.F) b.FirePlayer();
                else if (k == KeyCode.B) b.TryBoard();
                else if (k == KeyCode.Alpha1) b.SetShot("round");
                else if (k == KeyCode.Alpha2) b.SetShot("chain");
                else if (k == KeyCode.Alpha3) b.SetShot("grape");
            }
        }

        // ------------------------------------------------------------------ gui
        void OnGUI()
        {
            var ev = Event.current;
            if (ev.type == EventType.KeyDown && ev.keyCode != KeyCode.None) { held.Add(ev.keyCode); HandleKey(ev.keyCode); }
            else if (ev.type == EventType.KeyUp && ev.keyCode != KeyCode.None) held.Remove(ev.keyCode);

            // letterbox: draw everything in a fixed 960x600 space
            float s = Mathf.Min(UnityEngine.Screen.width / W, UnityEngine.Screen.height / H);
            Vector2 off = new Vector2((UnityEngine.Screen.width - W * s) * 0.5f, (UnityEngine.Screen.height - H * s) * 0.5f);
            Matrix4x4 prevMatrix = GUI.matrix;
            GUI.matrix = Matrix4x4.TRS(new Vector3(off.x, off.y, 0), Quaternion.identity, new Vector3(s, s, 1));

            switch (game.screen)
            {
                case GameScreen.Title: Title(); break;
                case GameScreen.Create: Create(); break;
                case GameScreen.Map: Map(); break;
                case GameScreen.Message: Message(); break;
                case GameScreen.Battle: BattleScreen(); break;
                case GameScreen.Port: Port(); break;
                case GameScreen.GameOver: GameOver(); break;
                case GameScreen.Victory: Victory(); break;
            }

            GUI.matrix = prevMatrix;
        }

        // --------------------------------------------------------------- helpers
        void Fill(float x, float y, float w, float h, Color c)
        {
            var old = GUI.color; GUI.color = c; GUI.DrawTexture(new Rect(x, y, w, h), white); GUI.color = old;
        }
        void PanelBox(float x, float y, float w, float h) { Fill(x, y, w, h, Panel); Fill(x, y, w, 1, new Color(1, 1, 1, 0.08f)); }
        void Bar(float x, float y, float w, float h, float frac, Color c)
        {
            Fill(x, y, w, h, Ink); frac = Mathf.Clamp01(frac); if (frac > 0) Fill(x, y, Mathf.Max(2, w * frac), h, c);
        }
        void Txt(string t, float x, float y, int size, Color c, TextAnchor anchor = TextAnchor.UpperLeft, bool bold = false, float w = 0, bool wrap = false)
        {
            var st = new GUIStyle();
            st.fontSize = size; st.alignment = anchor; st.fontStyle = bold ? FontStyle.Bold : FontStyle.Normal;
            st.normal.textColor = c; st.wordWrap = wrap;
            GUI.Label(new Rect(x, y, w > 0 ? w : W, wrap ? 200 : size + 10), t, st);
        }
        // Invisible clickable region (no button chrome) for map nodes, target rows, etc.
        bool Hit(float x, float y, float w, float h) => GUI.Button(new Rect(x, y, w, h), GUIContent.none, GUIStyle.none);
        bool Btn(float x, float y, float w, float h, string label, int size = 15, Color? bg = null, bool disabled = false)
        {
            var old = GUI.enabled; GUI.enabled = !disabled;
            var st = new GUIStyle(GUI.skin.button) { fontSize = size };
            st.normal.textColor = disabled ? new Color(0.37f, 0.43f, 0.47f) : TextC;
            st.hover.textColor = Hi;
            bool clicked = GUI.Button(new Rect(x, y, w, h), label, st) && !disabled;
            GUI.enabled = old;
            return clicked;
        }

        void SeaBackground()
        {
            Fill(0, 0, W, H, SeaDeep);
            var old = GUI.color; GUI.color = new Color(1, 1, 1, 0.03f);
            for (float y = 20; y < H; y += 26) GUI.DrawTexture(new Rect(0, y, W, 1), white);
            GUI.color = old;
        }

        // ---------------------------------------------------------------- screens
        void Title()
        {
            SeaBackground();
            Txt("BLACK TIDE", 0, 150, 60, Hi, TextAnchor.UpperCenter, true);
            Txt("a pirate sea-battle roguelike", 0, 215, 20, Dim, TextAnchor.UpperCenter);
            if (Btn(W / 2 - 110, 290, 220, 52, "New Voyage", 20, Wood)) { game.screen = GameScreen.Create; }
            bool cont = PlayerPrefs.HasKey(SAVE_KEY);
            if (Btn(W / 2 - 110, 356, 220, 46, "Continue", 18, null, !cont) && cont) Load();
            Txt("Post your crew. Work the guns. Pump, patch, and board for the prize.", 0, 470, 15, Dim, TextAnchor.UpperCenter);
            Txt("Space pause  ·  F fire  ·  B board  ·  1/2/3 shot  ·  click a mate, then a station", 0, 496, 14, Dim, TextAnchor.UpperCenter);
        }

        void Create()
        {
            SeaBackground();
            Txt("Choose your captain", 0, 80, 34, Hi, TextAnchor.UpperCenter, true);
            var keys = new List<string>(Database.Captains.Keys);
            float cw = 270, gap = 24, total = keys.Count * cw + (keys.Count - 1) * gap, x = (W - total) / 2;
            foreach (var k in keys)
            {
                var ct = Database.Captains[k];
                PanelBox(x, 160, cw, 230);
                Txt(ct.Label, x, 200, 24, TextC, TextAnchor.UpperCenter, true, cw);
                Txt(ct.Blurb, x + 20, 244, 15, Dim, TextAnchor.UpperLeft, false, cw - 40, true);
                if (Btn(x + 35, 340, cw - 70, 38, "Set Sail", 16, Wood)) { game.NewGame(k); Save(); }
                x += cw + gap;
            }
            if (Btn(24, H - 56, 120, 36, "Back", 14)) game.screen = GameScreen.Title;
        }

        void Map()
        {
            SeaBackground();
            var cur = game.NodeById(game.run.currentNode);
            // edges
            var old = GUI.color; GUI.color = new Color(0.902f, 0.706f, 0.133f, 0.22f);
            foreach (var n in game.map)
                foreach (var l in n.links)
                    if (l > n.id) { var o = game.NodeById(l); DrawLine((float)n.x, (float)n.y, (float)o.x, (float)o.y, 2); }
            GUI.color = old;
            // nodes
            foreach (var n in game.map)
            {
                bool adj = cur.links.Contains(n.id);
                Color c = n.type == "port" ? Blue : n.type == "enemy" ? Red : n.type == "start" ? Green : new Color(0.224f, 0.314f, 0.373f);
                if (!n.revealed) c = new Color(0.141f, 0.208f, 0.251f);
                if (adj) Fill((float)n.x - 19, (float)n.y - 19, 38, 38, new Color(0.957f, 0.843f, 0.478f, 0.5f));  // glow
                Fill((float)n.x - 15, (float)n.y - 15, 30, 30, c);
                string label = !n.revealed ? "?" : (n.type == "port" ? "[P] " : n.type == "enemy" ? "[X] " : "") + n.name;
                Txt(label, (float)n.x - 90, (float)n.y + 20, 14, n.revealed ? TextC : Dim, TextAnchor.UpperCenter, false, 180);
                if (adj && Hit((float)n.x - 15, (float)n.y - 15, 30, 30)) { game.SailTo(n.id); if (game.screen == GameScreen.Map) Save(); }
            }
            Txt("You", (float)cur.x - 40, (float)cur.y - 40, 14, Hi, TextAnchor.UpperCenter, true, 80);
            // HUD
            PanelBox(0, H - 64, W, 64);
            var r = game.run;
            Txt("Gold " + r.gold, 24, H - 46, 18, Gold, TextAnchor.UpperLeft, true);
            Txt("Supplies " + r.supplies, 160, H - 46, 17, r.supplies <= 2 ? Danger : TextC);
            Txt("Crew " + r.crew.Count + "/" + r.Ship.CrewCap, 330, H - 46, 17, TextC);
            Txt("Notoriety " + r.notoriety + (r.notoriety >= Tuning.NotorHunted ? " HUNTED" : ""), 470, H - 46, 16, r.notoriety >= Tuning.NotorHunted ? Danger : Dim);
            Txt(r.Ship.Name, W - 200, H - 46, 16, Dim, TextAnchor.UpperRight, false, 176);
            Txt("Click a glowing node to sail there.", 0, H - 44, 14, Dim, TextAnchor.UpperCenter);
        }

        void Message()
        {
            SeaBackground();
            var m = game.message;
            PanelBox(W / 2 - 280, 200, 560, 200);
            Txt(m.title, W / 2 - 280, 240, 28, Hi, TextAnchor.UpperCenter, true, 560);
            float y = 290; foreach (var l in m.lines) { Txt(l, W / 2 - 250, y, 17, TextC, TextAnchor.UpperCenter, false, 500, true); y += 28; }
            if (Btn(W / 2 - 80, 350, 160, 40, "Onward", 16, Wood)) { game.DismissMessage(); Save(); }
        }

        void GameOver()
        {
            SeaBackground();
            Txt("DAVY JONES' LOCKER", 0, 220, 44, Danger, TextAnchor.UpperCenter, true);
            Txt("Your voyage ends beneath the waves.", 0, 275, 20, Dim, TextAnchor.UpperCenter);
            if (Btn(W / 2 - 110, 350, 220, 48, "New Voyage", 18, Wood)) { PlayerPrefs.DeleteKey(SAVE_KEY); game.screen = GameScreen.Title; }
        }
        void Victory()
        {
            SeaBackground();
            Txt("A LEGEND RETIRES", 0, 210, 44, Hi, TextAnchor.UpperCenter, true);
            Txt("Final fortune: " + game.run.gold + " gold", 0, 275, 22, Gold, TextAnchor.UpperCenter, true);
            if (Btn(W / 2 - 110, 350, 220, 48, "New Voyage", 18, Wood)) { PlayerPrefs.DeleteKey(SAVE_KEY); game.screen = GameScreen.Title; }
        }

        // ---------------------------------------------------------------- battle
        void DrawLine(float x1, float y1, float x2, float y2, float thickness)
        {
            Vector2 d = new Vector2(x2 - x1, y2 - y1); float len = d.magnitude; if (len < 0.01f) return;
            float ang = Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg;
            Matrix4x4 prev = GUI.matrix;
            GUIUtility.RotateAroundPivot(ang, new Vector2(x1, y1));
            GUI.DrawTexture(new Rect(x1, y1 - thickness / 2, len, thickness), white);
            GUI.matrix = prev;
        }

        void BattleScreen()
        {
            var b = game.battle; var p = b.player; var e = b.enemy;
            SeaBackground();

            // two ship-status panels: yours (left), the enemy's (right)
            ShipStatus(12, 16, 448, p, false);
            ShipStatus(500, 16, 448, e, true);

            // crew stations — the heart of it
            StationsPanel(12, 224, 936, 196);

            // bottom: shot / target / fire / board / pause + log
            BattleControls();

            if (b.outcome != null) OutcomeOverlay();
            else if (b.boarding != null) BoardingOverlay();
        }

        void ShipStatus(float x, float y, float w, BattleShip s, bool isEnemy)
        {
            var b = game.battle;
            PanelBox(x, y, w, 196);
            Color accent = isEnemy ? Red : Hi;
            Txt((isEnemy ? "ENEMY " : "YOUR ") + s.sc.Name.ToUpper(), x + 14, y + 10, 15, accent, TextAnchor.UpperLeft, true);
            if (isEnemy && s.surrendered) Txt("struck her colours!", x + w - 150, y + 12, 13, Gold, TextAnchor.UpperRight, true, 136);

            int crew = isEnemy ? s.crew : game.run.crew.Count;
            double ev = isEnemy ? b.EnemyEvasion() : b.PlayerEvasion();
            Txt("Crew " + crew, x + 14, y + 32, 12, Dim);
            Txt("Evade " + Mathf.RoundToInt((float)ev * 100) + "%", x + 108, y + 32, 12, Dim);
            string guns = "Guns " + b.LoadedCannons(s) + "/" + b.OperationalCannons(s) + (isEnemy ? "" : "  (" + b.CrewedCannons() + " crewed)");
            Txt(guns, x + 210, y + 32, 12, Dim);

            float ry = y + 54;
            foreach (var k in Database.Areas)
            {
                bool sel = isEnemy && b.target == k;
                if (isEnemy && Hit(x + 12, ry - 2, w - 24, 16)) b.SetTarget(k);
                float frac = (float)(s.areas.Get(k) / Tuning.AreaMax);
                Color col = frac > 0.5f ? Green : frac > 0.25f ? Gold : Danger;
                Txt((sel ? "▸ " : "") + Database.AreaInfo[k].Label, x + 16, ry, 12, sel ? Hi : TextC);
                Bar(x + 96, ry + 2, w - 176, 9, frac, col);
                ry += 18;
            }
            Txt("Water", x + 16, ry, 12, Blue);
            Bar(x + 96, ry + 2, w - 176, 9, (float)(s.water / Tuning.FloodSink), Blue);
            if (isEnemy) Txt("click an area to aim", x + 16, y + 36, 11, Dim, TextAnchor.UpperRight, false, w - 32);

            ReloadPips(x + 16, ry + 22, w - 32, s);
        }

        // A row of little bars, one per operational gun, filling as it reloads; gold when run out.
        void ReloadPips(float x, float y, float maxw, BattleShip s)
        {
            int op = game.battle.OperationalCannons(s);
            if (op <= 0) { Txt("guns dismounted", x, y - 2, 11, Danger); return; }
            float gap = 3;
            float pw = Mathf.Min(16f, (maxw - (op - 1) * gap) / op);
            for (int i = 0; i < op && i < s.cannons.Count; i++)
            {
                var cn = s.cannons[i];
                float px = x + i * (pw + gap);
                float frac = cn.loaded ? 1f : (cn.reloadMax > 0 ? 1f - (float)(cn.reload / cn.reloadMax) : 0f);
                Fill(px, y, pw, 8, Ink);
                if (frac > 0) Fill(px, y, pw * Mathf.Clamp01(frac), 8, cn.loaded ? Gold : new Color(0.49f, 0.38f, 0.19f));
            }
        }

        static readonly Station[] StationOrder = { Station.Guns, Station.Sails, Station.Pumps, Station.Repair };
        static readonly string[] StationNames = { "GUN DECK", "RIGGING", "BILGE PUMPS", "REPAIR PARTY" };
        static readonly string[] StationEffects =
        {
            "work the guns: reload + aim", "set the sails: dodge shot, mend masts",
            "man the pumps: bail water, patch hull", "damage control: mend rudder/guns/deck",
        };

        void StationsPanel(float x, float y, float w, float h)
        {
            var b = game.battle;
            PanelBox(x, y, w, h);
            string hint = selectedCrew != null
                ? "Posting " + selectedCrew.name + " — click a station"
                : "CREW — click a mate, then a station to post them";
            Txt(hint, x + 14, y + 8, 13, Hi, TextAnchor.UpperLeft, true);

            int n = StationOrder.Length;
            float gap = 12, bw = (w - 28 - (n - 1) * gap) / n, by = y + 32, bh = h - 44;
            for (int i = 0; i < n; i++)
                StationBox(x + 14 + i * (bw + gap), by, bw, bh, StationOrder[i], StationNames[i], StationEffects[i]);
        }

        void StationBox(float x, float y, float w, float h, Station st, string name, string eff)
        {
            var b = game.battle;
            Fill(x, y, w, h, PanelLt);
            bool armed = selectedCrew != null;
            if (Btn(x, y, w, 22, name + "  (" + b.CountAt(st) + ")", 12, armed ? Wood : new Color(0.09f, 0.16f, 0.2f)))
            {
                if (selectedCrew != null) { b.AssignStation(selectedCrew, st); selectedCrew = null; }
            }
            Txt(eff, x + 6, y + 25, 10, Dim, TextAnchor.UpperLeft, false, w - 12, true);

            float ty = y + 48;
            foreach (var c in game.run.crew)
            {
                if (c.station != st) continue;
                if (ty > y + h - 18) break;
                bool self = c == selectedCrew;
                Color bg = self ? Hi : (c.hp < c.maxHp ? new Color(0.36f, 0.27f, 0.11f) : new Color(0.07f, 0.13f, 0.17f));
                if (Btn(x + 6, ty, w - 12, 18, ShortName(c.name) + (c.hp < c.maxHp ? " ✚" : ""), 11, bg))
                    selectedCrew = self ? null : c;
                ty += 20;
            }
        }

        static string ShortName(string name)
        {
            if (string.IsNullOrEmpty(name)) return "hand";
            int sp = name.IndexOf(' ');
            return sp > 0 ? name.Substring(0, sp) : name;
        }

        void BattleControls()
        {
            var b = game.battle; var p = b.player;
            PanelBox(0, 430, W, H - 430);

            // shot select
            Txt("SHOT", 16, 440, 12, Dim);
            int i = 0;
            foreach (var k in new[] { "round", "chain", "grape" })
            {
                if (Btn(16, 458 + i * 26, 150, 22, Database.Shots[k].Label, 12, b.shot == k ? Green : PanelLt)) b.SetShot(k);
                i++;
            }
            Txt(Database.Shots[b.shot].Desc, 16, 540, 11, Dim, TextAnchor.UpperLeft, false, 160, true);

            // target + log
            Txt("Aiming: " + Database.AreaInfo[b.target].Label + "  ·  click an enemy area to change", 190, 440, 12, Hi);
            float ly = 462; foreach (var l in b.log) { Txt(l, 190, ly, 12, Dim, TextAnchor.UpperLeft, false, 470); ly += 16; }

            // fire / board / pause
            float fx = W - 196;
            bool canFire = b.OperationalCannons(p) > 0 && b.LoadedCannons(p) > 0;
            if (Btn(fx, 444, 180, 44, "FIRE  (F)", 18, canFire ? new Color(0.478f, 0.239f, 0.165f) : PanelLt, !canFire)) b.FirePlayer();
            bool canBoard = b.CanBoard();
            if (Btn(fx, 494, 180, 30, "BOARD  (B)", 14, canBoard ? Wood : PanelLt, !canBoard)) b.TryBoard();
            if (Btn(fx, 528, 180, 26, b.paused ? "Resume  (Space)" : "Pause  (Space)", 12)) b.TogglePause();

            if (b.paused) Txt("— PAUSED —  give orders freely", 0, 410, 15, Hi, TextAnchor.UpperCenter, true);
            if (b.flashT > 0) Txt(b.flash, 0, 410, 14, Danger, TextAnchor.UpperCenter, true);
        }

        void BoardingOverlay()
        {
            var b = game.battle;
            PanelBox(W / 2 - 220, 120, 440, 160);
            Txt("BOARDING ACTION", W / 2 - 220, 150, 26, Hi, TextAnchor.UpperCenter, true, 440);
            Txt("Your crew: " + game.run.crew.Count, W / 2 - 190, 200, 15, TextC);
            Txt("Enemy: " + b.enemy.crew, W / 2 + 40, 200, 15, TextC);
            Txt("Steel rings across the deck...", W / 2 - 220, 240, 15, Dim, TextAnchor.UpperCenter, false, 440);
        }

        void OutcomeOverlay()
        {
            var o = game.battle.outcome;
            PanelBox(W / 2 - 250, 150, 500, 240);
            if (o.kind == "lost")
            {
                Txt("DEFEAT", W / 2 - 250, 205, 32, Danger, TextAnchor.UpperCenter, true, 500);
                Txt("Water over the rail, colours down.", W / 2 - 230, 255, 17, TextC, TextAnchor.UpperCenter, false, 460);
                if (Btn(W / 2 - 90, 330, 180, 40, "Continue", 16)) { game.FinishBattle(); if (game.screen == GameScreen.Map) Save(); }
                return;
            }
            Txt(o.title, W / 2 - 250, 195, 30, Hi, TextAnchor.UpperCenter, true, 500);
            float y = 240; foreach (var l in o.lines) { Txt(l, W / 2 - 230, y, 16, TextC, TextAnchor.UpperCenter, false, 460, true); y += 26; }
            Txt("+" + o.gold + " gold   +" + o.supplies + " supplies", W / 2 - 250, y + 6, 18, Gold, TextAnchor.UpperCenter, true, 500);
            if (o.prizeClass != null)
            {
                if (Btn(W / 2 - 200, 340, 190, 40, "Take her - " + Database.Ships[o.prizeClass].Name, 14, Wood)) { game.TakePrize(); Save(); }
                if (Btn(W / 2 + 10, 340, 190, 40, "Keep your ship", 14)) { game.FinishBattle(); Save(); }
            }
            else if (Btn(W / 2 - 90, 345, 180, 40, "Onward", 16)) { game.FinishBattle(); Save(); }
        }

        // ------------------------------------------------------------------ port
        int portTab = 0; // 0 yard, 1 drydock, 2 tavern
        void Port()
        {
            SeaBackground();
            var r = game.run;
            PanelBox(20, 20, W - 40, 64);
            Txt(game.NodeById(r.currentNode).name, 40, 36, 26, Hi, TextAnchor.UpperLeft, true);
            Txt("Gold " + r.gold, W - 360, 34, 18, Gold, TextAnchor.UpperLeft, true);
            Txt("Supplies " + r.supplies, W - 360, 60, 15, TextC);
            Txt("Crew " + r.crew.Count + "/" + r.Ship.CrewCap, W - 200, 34, 18, TextC);
            Txt(r.Ship.Name, W - 200, 60, 15, Dim);

            string[] tabs = { "Shipwright", "Drydock", "Tavern" };
            for (int i = 0; i < tabs.Length; i++)
                if (Btn(40 + i * 160, 100, 150, 38, tabs[i], 15, portTab == i ? Wood : PanelLt)) portTab = i;

            PanelBox(40, 150, W - 80, 320);
            if (portTab == 0) Yard();
            else if (portTab == 1) Drydock();
            else Tavern();

            if (Btn(40, H - 54, 150, 40, "Set Sail", 15, Wood)) { game.screen = GameScreen.Map; Save(); }
            if (game.CanRetire())
            {
                if (Btn(W - 230, H - 54, 190, 40, "Retire Rich (" + Tuning.RetireGold + ")", 14, Green)) { game.screen = GameScreen.Victory; PlayerPrefs.DeleteKey(SAVE_KEY); }
            }
            else Txt("Reach " + Tuning.RetireGold + " gold to retire a legend.", W - 420, H - 44, 14, Dim, TextAnchor.UpperRight, false, 380);
        }

        void Yard()
        {
            var r = game.run;
            Txt("Hull & rigging repairs", 70, 180, 20, TextC, TextAnchor.UpperLeft, true);
            float y = 220;
            foreach (var k in Database.Areas)
            {
                Txt(Database.AreaInfo[k].Label, 70, y, 16, TextC);
                Bar(190, y + 3, 160, 12, (float)(r.areas.Get(k) / Tuning.AreaMax), r.areas.Get(k) > 50 ? Green : Gold);
                Txt(Database.AreaInfo[k].Effect, 370, y, 13, Dim);
                y += 30;
            }
            int cost = game.RepairCost();
            if (cost <= 0) Txt("Your ship is sound. Nothing to mend.", 70, y + 16, 16, Green);
            else if (Btn(70, y + 10, 260, 42, "Repair all - " + cost + " gold", 15, r.gold >= cost ? Green : PanelLt, r.gold < cost))
            { game.RepairAll(); Save(); }
        }

        void Drydock()
        {
            var r = game.run;
            Txt("The Drydock - trade your hull up the ladder", 70, 176, 18, TextC, TextAnchor.UpperLeft, true);
            float y = 200;
            foreach (var key in Database.ShipLadder)
            {
                var sc = Database.Ships[key]; bool mine = key == r.shipClass;
                PanelBox(60, y, W - 120, 50);
                Txt((mine ? "> " : "") + sc.Name, 78, y + 8, 17, mine ? Hi : TextC, TextAnchor.UpperLeft, true);
                Txt("tier " + sc.Tier + "  -  " + sc.GunsPerSide + " guns/side  -  crew cap " + sc.CrewCap, 78, y + 28, 12, Dim);
                if (mine) Txt("your ship", W - 150, y + 16, 14, Gold);
                else
                {
                    int net = game.ShipBuyNet(key); bool can = game.CanBuyShip(key);
                    if (Btn(W - 250, y + 9, 190, 32, "Buy - " + net + " gold", 13, can ? Green : PanelLt, !can)) { game.BuyShip(key); Save(); }
                    if (r.crew.Count > sc.CrewCap) Txt("too many crew", W - 250, y + 44, 10, Danger);
                }
                y += 56;
            }
        }

        void Tavern()
        {
            var r = game.run;
            Txt("Tavern", 70, 180, 20, TextC, TextAnchor.UpperLeft, true);
            if (Btn(70, 220, 250, 40, "Recruit a hand - " + Database.RecruitCost + " gold", 14, game.CanRecruit() ? Green : PanelLt, !game.CanRecruit()))
            { game.Recruit(); Save(); }
            if (Btn(70, 275, 250, 40, "Buy 5 supplies - " + (Database.SupplyCost * 5) + " gold", 14, game.CanBuySupplies() ? PanelLt : PanelLt, !game.CanBuySupplies()))
            { game.BuySupplies(); Save(); }
            Txt("Your crew (" + r.crew.Count + "/" + r.Ship.CrewCap + "):", 420, 215, 16, TextC, TextAnchor.UpperLeft, true);
            float cy = 245;
            for (int i = 0; i < r.crew.Count && i < 8; i++)
            {
                var c = r.crew[i];
                Txt("- " + c.name + "   Gun " + Mathf.RoundToInt((float)c.gunnery) + "  Melee " + Mathf.RoundToInt((float)c.melee) + (c.hp < c.maxHp ? "  (wounded)" : ""), 430, cy, 13, c.hp < c.maxHp ? Gold : Dim);
                cy += 20;
            }
        }

        // ------------------------------------------------------------- save/load
        void Save()
        {
            try { PlayerPrefs.SetString(SAVE_KEY, JsonUtility.ToJson(game.SaveState())); PlayerPrefs.Save(); }
            catch { }
        }
        void Load()
        {
            try
            {
                var r = JsonUtility.FromJson<Run>(PlayerPrefs.GetString(SAVE_KEY));
                if (r != null && r.crew != null && r.crew.Count > 0) game.LoadState(r);
            }
            catch { }
        }
    }
}
