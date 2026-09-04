// Scene-card backdrops — pure SVG, one vibe per location.

export function SceneArt({ art }: { art: string }) {
  switch (art) {
    case 'cafe':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-cafe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a3a22" />
              <stop offset="1" stopColor="#2b1a10" />
            </linearGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-cafe)" />
          <circle cx="330" cy="20" r="34" fill="#f2c14e" opacity="0.25" />
          <rect x="24" y="30" width="90" height="66" rx="6" fill="#1d1109" />
          <rect x="30" y="36" width="78" height="42" rx="4" fill="#f2c14e" opacity="0.18" />
          {/* cup */}
          <path d="M 190 68 h 44 a 4 4 0 0 1 4 4 v 6 a 22 22 0 0 1 -22 20 h -8 a 22 22 0 0 1 -22 -20 v -6 a 4 4 0 0 1 4 -4 z" fill="#e8e3da" />
          <path d="M 238 74 h 8 a 8 8 0 0 1 0 16 h -6" fill="none" stroke="#e8e3da" strokeWidth="4" />
          <path d="M 202 58 q 3 -8 0 -14 M 214 60 q 3 -9 0 -16" stroke="#e8e3da" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <rect x="150" y="98" width="130" height="6" rx="3" fill="#0f0a06" />
        </svg>
      );
    case 'park':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-park" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7fb4c9" />
              <stop offset="0.6" stopColor="#4f7f6a" />
              <stop offset="1" stopColor="#2c4a3a" />
            </linearGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-park)" />
          <circle cx="70" cy="22" r="16" fill="#fff8d8" opacity="0.8" />
          <path d="M 0 78 q 100 -14 200 0 t 200 0 v 32 h -400 z" fill="#39657f" opacity="0.8" />
          <path d="M 0 88 q 100 -10 200 0 t 200 0 v 22 h -400 z" fill="#2c4f63" />
          {/* trees */}
          <circle cx="300" cy="52" r="20" fill="#2f5c40" />
          <circle cx="322" cy="60" r="14" fill="#356a49" />
          <rect x="297" y="64" width="6" height="20" fill="#4a3423" />
          <circle cx="120" cy="58" r="16" fill="#2f5c40" />
          <rect x="117" y="66" width="5" height="18" fill="#4a3423" />
        </svg>
      );
    case 'bar':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#14101f" />
              <stop offset="1" stopColor="#241430" />
            </linearGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-bar)" />
          {/* neon palm */}
          <g stroke="#ff5fa0" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95">
            <path d="M 200 92 q -4 -26 0 -44" />
            <path d="M 200 48 q -18 -10 -30 2" />
            <path d="M 200 48 q 18 -10 30 2" />
            <path d="M 200 48 q -10 -16 -2 -26" />
            <path d="M 200 48 q 10 -16 2 -26" />
          </g>
          <g stroke="#54e8e0" strokeWidth="2.4" fill="none" opacity="0.9">
            <rect x="130" y="20" width="140" height="72" rx="14" />
          </g>
          <circle cx="90" cy="40" r="3" fill="#ffd166" opacity="0.9" />
          <circle cx="320" cy="30" r="2.4" fill="#ffd166" opacity="0.7" />
          <circle cx="345" cy="66" r="2" fill="#ff5fa0" opacity="0.7" />
          <circle cx="60" cy="76" r="2.2" fill="#54e8e0" opacity="0.7" />
        </svg>
      );
    case 'dinner':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-din" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a1420" />
              <stop offset="1" stopColor="#1c0a10" />
            </linearGradient>
            <radialGradient id="g-candle" cx="0.5" cy="0.4" r="0.6">
              <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-din)" />
          <ellipse cx="200" cy="60" rx="120" ry="60" fill="url(#g-candle)" />
          {/* candle */}
          <rect x="195" y="58" width="10" height="26" rx="3" fill="#f2e6c9" />
          <ellipse cx="200" cy="52" rx="4" ry="7" fill="#ffb347" />
          <ellipse cx="200" cy="50" rx="1.8" ry="3.6" fill="#fff3d0" />
          {/* table + glasses */}
          <path d="M 110 92 h 180 q 8 0 8 8 v 10 h -196 v -10 q 0 -8 8 -8 z" fill="#57202e" />
          <path d="M 150 70 q 0 14 10 16 v 6 h 4 v -6 q 10 -2 10 -16 z" fill="none" stroke="#e8cfd4" strokeWidth="2" opacity="0.8" />
          <path d="M 226 70 q 0 14 10 16 v 6 h 4 v -6 q 10 -2 10 -16 z" fill="none" stroke="#e8cfd4" strokeWidth="2" opacity="0.8" />
        </svg>
      );
    case 'frat':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-frat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a1420" />
              <stop offset="1" stopColor="#3d1424" />
            </linearGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-frat)" />
          {/* greek banner */}
          <path d="M 120 8 l 160 0 l -10 26 l -140 0 z" fill="#7a1f2e" />
          <text x="200" y="27" textAnchor="middle" fill="#ffd166" fontSize="16" fontFamily="Georgia">ΣΡ</text>
          {/* keg */}
          <rect x="40" y="70" width="34" height="38" rx="8" fill="#8a8f98" />
          <rect x="40" y="80" width="34" height="4" fill="#6a6f78" />
          <rect x="52" y="62" width="10" height="10" rx="3" fill="#6a6f78" />
          {/* pong table */}
          <rect x="150" y="84" width="140" height="10" rx="3" fill="#274a2e" />
          <rect x="156" y="94" width="8" height="16" fill="#183020" />
          <rect x="276" y="94" width="8" height="16" fill="#183020" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M ${160 + (i % 3) * 14 + Math.floor(i / 3) * 100} 72 l 10 0 l -1.6 12 l -6.8 0 z`}
              fill="#d64545"
            />
          ))}
          <circle cx="230" cy="66" r="5" fill="#fff" opacity="0.9" />
          <circle cx="340" cy="30" r="2.4" fill="#ffd166" opacity="0.6" />
        </svg>
      );
    case 'pool':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-pool" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8fd0e8" />
              <stop offset="0.55" stopColor="#5fb8d8" />
              <stop offset="0.56" stopColor="#1f8ab0" />
              <stop offset="1" stopColor="#136a8f" />
            </linearGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-pool)" />
          <circle cx="60" cy="20" r="15" fill="#fff3c4" opacity="0.95" />
          {/* water ripples */}
          <path d="M 0 70 q 30 -5 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0" stroke="#bfe9f7" strokeWidth="2.5" fill="none" opacity="0.7" />
          <path d="M 0 88 q 30 -5 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0" stroke="#bfe9f7" strokeWidth="2" fill="none" opacity="0.5" />
          {/* floatie */}
          <circle cx="290" cy="78" r="16" fill="#ff5fa0" />
          <circle cx="290" cy="78" r="8" fill="#1f8ab0" />
          {/* diving board */}
          <rect x="20" y="52" width="52" height="5" rx="2" fill="#e8e3da" />
          <rect x="24" y="57" width="8" height="14" fill="#c9c4bb" />
          {/* beach ball */}
          <circle cx="180" cy="84" r="9" fill="#fff" />
          <path d="M 173 78 a 9 9 0 0 1 14 0 z" fill="#d64545" />
          <path d="M 173 90 a 9 9 0 0 0 14 0 z" fill="#2f6a8a" />
        </svg>
      );
    case 'roofparty':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-roofp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#141b33" />
              <stop offset="1" stopColor="#232946" />
            </linearGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-roofp)" />
          <circle cx="330" cy="20" r="12" fill="#f2ecd8" opacity="0.9" />
          {/* skyline */}
          <g fill="#0c1122">
            <rect x="0" y="58" width="34" height="52" />
            <rect x="40" y="44" width="26" height="66" />
            <rect x="72" y="62" width="30" height="48" />
            <rect x="290" y="50" width="28" height="60" />
            <rect x="324" y="64" width="36" height="46" />
            <rect x="366" y="46" width="34" height="64" />
          </g>
          {/* lit windows */}
          {[8, 18, 46, 52, 80, 296, 306, 332, 374, 384].map((x, i) => (
            <rect key={i} x={x} y={54 + ((i * 13) % 40)} width="5" height="6" fill="#ffd166" opacity="0.75" />
          ))}
          {/* terrace rail + lights */}
          <rect x="110" y="92" width="170" height="4" rx="2" fill="#3a4266" />
          <path d="M 110 70 q 85 22 170 0" stroke="#3a4266" strokeWidth="2" fill="none" />
          {[125, 155, 185, 215, 245, 268].map((x, i) => (
            <circle key={x} cx={x} cy={78 + Math.sin(i) * 4} r="3" fill={['#ffd166', '#ff9f66', '#ffe9a8'][i % 3]} />
          ))}
        </svg>
      );
    case 'party':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g-party" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1c1030" />
              <stop offset="1" stopColor="#2b1226" />
            </linearGradient>
          </defs>
          <rect width="400" height="110" fill="url(#g-party)" />
          {/* string lights */}
          <path d="M 0 22 q 100 26 200 8 t 200 10" stroke="#3a2c52" strokeWidth="2" fill="none" />
          {[30, 75, 120, 168, 215, 262, 310, 355].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={26 + Math.sin(i * 1.7) * 9 + 6}
              r="3.4"
              fill={['#ffd166', '#ff5fa0', '#54e8e0', '#a78bfa'][i % 4]}
              opacity="0.95"
            />
          ))}
          {/* crowd silhouettes */}
          <g fill="#120a1c">
            <circle cx="70" cy="78" r="12" />
            <rect x="56" y="88" width="28" height="26" rx="8" />
            <circle cx="140" cy="82" r="11" />
            <rect x="127" y="91" width="26" height="24" rx="8" />
            <circle cx="255" cy="79" r="12" />
            <rect x="241" y="89" width="28" height="25" rx="8" />
            <circle cx="330" cy="83" r="10" />
            <rect x="318" y="92" width="24" height="22" rx="8" />
          </g>
          {/* red cups */}
          <g>
            <path d="M 196 84 l 10 0 l -1.6 16 l -6.8 0 z" fill="#d64545" />
            <path d="M 212 88 l 9 0 l -1.4 13 l -6.2 0 z" fill="#d64545" />
          </g>
          <circle cx="368" cy="18" r="2.2" fill="#ffd166" opacity="0.6" />
          <circle cx="22" cy="52" r="2" fill="#ff5fa0" opacity="0.5" />
        </svg>
      );
    case 'phone':
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect width="400" height="110" fill="#101418" />
          <rect x="150" y="10" width="100" height="140" rx="16" fill="#1c232b" stroke="#39434e" />
          <rect x="162" y="30" width="56" height="18" rx="9" fill="#2a3540" />
          <rect x="184" y="56" width="54" height="18" rx="9" fill="#2e6b4f" />
          <rect x="162" y="82" width="44" height="16" rx="8" fill="#2a3540" />
          <circle cx="90" cy="55" r="2" fill="#54e8e0" opacity="0.5" />
          <circle cx="320" cy="40" r="2" fill="#ff5fa0" opacity="0.5" />
        </svg>
      );
    default:
      return (
        <svg className="scene-art" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect width="400" height="110" fill="#181420" />
          <circle cx="330" cy="24" r="20" fill="#2c2438" />
        </svg>
      );
  }
}
