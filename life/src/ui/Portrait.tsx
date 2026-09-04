// Krystalle's portrait — stylized inline SVG with mood variants. Dark hair,
// freckles, 27, and exactly one raised eyebrow when you deserve it.

import type { Mood } from '../engine/types';
import { MOOD_CAPTIONS } from '../content/krystalle';
import { OUTFITS, type Outfit, type PortraitTop } from '../content/outfits';

const SKIN = '#c98e6d';
const SKIN_SHADE = '#b57a5a';
const HAIR = '#241a1c';
const HAIR_SHINE = '#3d2c30';
const BLUSH = '#d96a6a';
const LIP = '#a84c50';

// Shoulders/top rendered from her current outfit so the portrait matches the
// scene — scrubs at the café, a dress at dinner, a swimsuit at the pool.
function Top({ outfit }: { outfit: Outfit }) {
  const c = outfit.color;
  const dark = '#00000030';
  switch (outfit.top) {
    case 'swim':
      return (
        <g>
          {/* bare shoulders + straps */}
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={SKIN} />
          <path d="M 20 120 q 8 -26 40 -26 l 0 26 z" fill={SKIN_SHADE} opacity={0.5} />
          <path d="M 30 120 q 14 -14 30 -12 l 0 12 z" fill={c} />
          <path d="M 90 120 q -14 -14 -30 -12 l 0 12 z" fill={c} />
          <rect x="44" y="98" width="5" height="16" rx="2" fill={c} transform="rotate(14 46 106)" />
          <rect x="71" y="98" width="5" height="16" rx="2" fill={c} transform="rotate(-14 74 106)" />
        </g>
      );
    case 'dress':
      return (
        <g>
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={SKIN} />
          <path d="M 24 120 q 10 -20 36 -19 q 26 -1 36 19 z" fill={c} />
          <path d="M 24 120 q 10 -20 36 -19 l 0 19 z" fill={dark} />
          <circle cx="60" cy="104" r="2" fill="#e8c15a" />
        </g>
      );
    case 'jacket':
      return (
        <g>
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={c} />
          <path d="M 52 96 l 8 8 l 8 -8 l 0 24 l -16 0 z" fill="#d8cfc4" />
          <path d="M 38 99 l 14 -3 l 4 10 l -10 14 z" fill={dark} />
          <path d="M 82 99 l -14 -3 l -4 10 l 10 14 z" fill={dark} />
        </g>
      );
    case 'scrubs':
      return (
        <g>
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={c} />
          <path d="M 52 95 l 8 10 l 8 -10 l -4 -1 l -4 4 l -4 -4 z" fill={dark} />
          <rect x="70" y="106" width="12" height="9" rx="1.5" fill={dark} />
        </g>
      );
    case 'windbreaker':
      return (
        <g>
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={c} />
          <line x1="60" y1="95" x2="60" y2="120" stroke={dark} strokeWidth="2.4" />
          <path d="M 20 120 q 8 -26 40 -26 l 0 4 q -28 0 -36 22 z" fill="#ffffff30" />
        </g>
      );
    case 'towel':
      return (
        <g>
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={SKIN} />
          {/* towel wrapped just under the shoulders */}
          <path d="M 22 120 q 8 -18 38 -17 q 30 -1 38 17 z" fill={c} />
          <path d="M 22 120 q 8 -18 38 -17 l 0 3 q -26 0 -34 14 z" fill={dark} />
          <line x1="60" y1="103" x2="60" y2="120" stroke={dark} strokeWidth="2" />
        </g>
      );
    case 'bare':
      return (
        <g>
          {/* dark water up to the shoulders, moonlit ripple at the line */}
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={SKIN} />
          <path d="M 14 112 q 20 -8 46 -4 q 30 4 48 2 l 0 12 l -94 0 z" fill={c} />
          <path d="M 16 110 q 22 -6 44 -3 q 28 4 46 1" stroke="#bfe9f7" strokeWidth="1.6" fill="none" opacity="0.6" />
        </g>
      );
    default: // sweater / tee
      return (
        <g>
          <path d="M 20 120 q 8 -26 40 -26 q 32 0 40 26 z" fill={c} />
          <path d="M 20 120 q 8 -26 40 -26 l 0 26 z" fill={dark} />
        </g>
      );
  }
}

function Freckles() {
  const dots: JSX.Element[] = [];
  const spots = [
    [-16, 2], [-11, -2], [-7, 3], [-13, 6], [-5, -1],
    [16, 2], [11, -2], [7, 3], [13, 6], [5, -1], [0, 4],
  ];
  spots.forEach(([x, y], i) =>
    dots.push(
      <circle key={i} cx={60 + x} cy={66 + y} r={0.9} fill="#8a5a3e" opacity={0.7} />
    )
  );
  return <g>{dots}</g>;
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'laughing') {
    // closed happy arcs
    return (
      <g stroke={HAIR} strokeWidth={2.2} fill="none" strokeLinecap="round">
        <path d="M 42 58 q 6 -6 12 0" />
        <path d="M 66 58 q 6 -6 12 0" />
      </g>
    );
  }
  const uneasy = mood === 'uneasy';
  const annoyed = mood === 'annoyed';
  const warm = mood === 'warm' || mood === 'flushed';
  const eyeH = annoyed ? 3.4 : warm ? 4.2 : 5;
  return (
    <g>
      <ellipse cx={48} cy={58} rx={5.4} ry={eyeH} fill="#fff" />
      <ellipse cx={72} cy={58} rx={5.4} ry={eyeH} fill="#fff" />
      <circle cx={uneasy ? 46.5 : 48.5} cy={58.5} r={2.7} fill="#2a1b12" />
      <circle cx={uneasy ? 70.5 : 72.5} cy={58.5} r={2.7} fill="#2a1b12" />
      <circle cx={uneasy ? 47.3 : 49.3} cy={57.6} r={0.9} fill="#fff" />
      <circle cx={uneasy ? 71.3 : 73.3} cy={57.6} r={0.9} fill="#fff" />
      {annoyed && (
        <g stroke={SKIN_SHADE} strokeWidth={1.6}>
          <line x1={42} y1={55.5} x2={54} y2={56.8} />
          <line x1={66} y1={56.8} x2={78} y2={55.5} />
        </g>
      )}
    </g>
  );
}

function Brows({ mood }: { mood: Mood }) {
  const stroke = { stroke: HAIR, strokeWidth: 2.6, fill: 'none', strokeLinecap: 'round' as const };
  switch (mood) {
    case 'annoyed':
      // the one eyebrow. Just the one.
      return (
        <g {...stroke}>
          <path d="M 41 50 q 7 -2 14 0" />
          <path d="M 65 46 q 7 -3 14 1" />
        </g>
      );
    case 'uneasy':
      return (
        <g {...stroke}>
          <path d="M 41 49 q 7 3 14 1" />
          <path d="M 65 50 q 7 -3 14 -1" />
        </g>
      );
    case 'laughing':
    case 'warm':
    case 'flushed':
      return (
        <g {...stroke}>
          <path d="M 41 49 q 7 -4 14 -1" />
          <path d="M 65 48 q 7 -3 14 1" />
        </g>
      );
    default:
      return (
        <g {...stroke}>
          <path d="M 41 50 q 7 -3 14 -1" />
          <path d="M 65 49 q 7 -2 14 1" />
        </g>
      );
  }
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'laughing':
      return (
        <g>
          <path d="M 50 76 q 10 12 20 0 z" fill={LIP} />
          <path d="M 52 76.5 q 8 4 16 0" fill="#fff" />
        </g>
      );
    case 'warm':
      return <path d="M 50 77 q 10 7 20 0" stroke={LIP} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
    case 'flushed':
      return (
        <g>
          <path d="M 52 77 q 8 6 16 0" stroke={LIP} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'uneasy':
      return <path d="M 52 79 q 8 -1 16 0" stroke={LIP} strokeWidth={2.4} fill="none" strokeLinecap="round" />;
    case 'annoyed':
      return <path d="M 51 80 q 9 -4 18 1" stroke={LIP} strokeWidth={2.4} fill="none" strokeLinecap="round" />;
    default:
      return <path d="M 51 78 q 9 4 18 0" stroke={LIP} strokeWidth={2.4} fill="none" strokeLinecap="round" />;
  }
}

export function Portrait({
  mood,
  size = 132,
  outfitId,
  top,
}: {
  mood: Mood;
  size?: number;
  outfitId?: string;
  /** Derived from the garment tracker; overrides the named outfit's shape. */
  top?: PortraitTop;
}) {
  const blush = mood === 'flushed' || mood === 'laughing';
  const named = (outfitId && OUTFITS[outfitId]) || OUTFITS['k-sweater'];
  const outfit = top ? { ...named, top } : named;
  return (
    <figure className={`portrait mood-${mood}`}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Krystalle looks ${mood}`}>
        <defs>
          <clipPath id="pframe">
            <rect x="0" y="0" width="120" height="120" rx="16" />
          </clipPath>
        </defs>
        <g clipPath="url(#pframe)">
          <rect width="120" height="120" fill="#1b1420" />
          <circle cx="98" cy="18" r="26" fill="#2c1f33" />
          <circle cx="14" cy="104" r="30" fill="#231a2b" />
          {/* shoulders / outfit */}
          <Top outfit={outfit} />
          {/* neck */}
          <rect x="52" y="86" width="16" height="14" fill={SKIN_SHADE} rx="5" />
          {/* hair back */}
          <path d="M 24 60 q -2 -40 36 -42 q 38 2 36 42 q 1 34 -10 46 l -8 -6 q 6 -18 4 -34 l -44 0 q -2 16 4 34 l -8 6 q -11 -12 -10 -46 z" fill={HAIR} />
          {/* face */}
          <ellipse cx="60" cy="62" rx="26" ry="30" fill={SKIN} />
          <ellipse cx="60" cy="63" rx="26" ry="29" fill="none" stroke={SKIN_SHADE} strokeOpacity="0.35" />
          {/* ears */}
          <circle cx="33" cy="64" r="5" fill={SKIN} />
          <circle cx="87" cy="64" r="5" fill={SKIN} />
          <circle cx="87" cy="68" r="1.4" fill="#e8c15a" />
          {/* hair front */}
          <path d="M 30 58 q -4 -34 30 -36 q 34 2 30 36 q -2 -14 -12 -18 q 4 8 2 12 q -8 -14 -22 -12 q -16 -2 -22 14 q -3 -6 -6 4 z" fill={HAIR} />
          <path d="M 38 30 q 12 -6 26 0 q -14 -3 -26 0 z" fill={HAIR_SHINE} />
          {blush && (
            <g opacity={0.55}>
              <ellipse cx="42" cy="70" rx="6.5" ry="3.4" fill={BLUSH} />
              <ellipse cx="78" cy="70" rx="6.5" ry="3.4" fill={BLUSH} />
            </g>
          )}
          {mood === 'flushed' && (
            <g opacity={0.4}>
              <ellipse cx="42" cy="70" rx="8" ry="4.2" fill={BLUSH} />
              <ellipse cx="78" cy="70" rx="8" ry="4.2" fill={BLUSH} />
            </g>
          )}
          <Freckles />
          <Brows mood={mood} />
          <Eyes mood={mood} />
          {/* nose */}
          <path d="M 59 64 q -2 5 1 7" stroke={SKIN_SHADE} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <Mouth mood={mood} />
        </g>
        <rect x="0.5" y="0.5" width="119" height="119" rx="16" fill="none" stroke="rgba(255,255,255,0.14)" />
      </svg>
      <figcaption>
        Krystalle — <em>{MOOD_CAPTIONS[mood]}</em>
        {outfitId && OUTFITS[outfitId] && (
          <>
            <br />
            <span className="outfit-line">wearing {OUTFITS[outfitId].label}</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
