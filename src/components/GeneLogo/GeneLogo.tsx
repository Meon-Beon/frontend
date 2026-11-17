import { useId } from 'react'

type GeneLogoProps = {
  className?: string
  /** 스크린리더용 이름. 옆에 브랜드명 글자가 있으면 ''로 넘겨 장식으로 처리 */
  title?: string
  /** 아래 '내 진 설 계' 글자를 뺀 GENE 글자만 */
  compact?: boolean
}

/** N 자리의 이중나선: 왼쪽 위(보라)에서 오른쪽 아래(민트)로 두 가닥이 감기며 내려옴 */
const N_TOP = { x: 302, y: 16 }
const N_BOTTOM = { x: 392, y: 154 }
const TWIST_WIDTH = 17

const AXIS = (() => {
  const dx = N_BOTTOM.x - N_TOP.x
  const dy = N_BOTTOM.y - N_TOP.y
  const len = Math.hypot(dx, dy)
  return { dx, dy, nx: -dy / len, ny: dx / len }
})()

function strand(sign: 1 | -1) {
  const { dx, dy, nx, ny } = AXIS
  const pts: string[] = []
  for (let k = 0; k <= 40; k++) {
    const t = k / 40
    // N 의 왼쪽 위 모서리에서 오른쪽 아래 모서리까지, 가운데에서 한 번 엇갈림
    const off = sign * TWIST_WIDTH * Math.sin(t * Math.PI * 2)
    pts.push(`${(N_TOP.x + dx * t + nx * off).toFixed(1)} ${(N_TOP.y + dy * t + ny * off).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
}

/** 두 가닥이 가장 벌어진 곳을 잇는 염기쌍 막대 */
function rung(t: number) {
  const { dx, dy, nx, ny } = AXIS
  const cx = N_TOP.x + dx * t
  const cy = N_TOP.y + dy * t
  const off = TWIST_WIDTH * Math.sin(t * Math.PI * 2) * 0.8
  return `M${(cx + nx * off).toFixed(1)} ${(cy + ny * off).toFixed(1)} L${(cx - nx * off).toFixed(1)} ${(cy - ny * off).toFixed(1)}`
}

const STRAND_A = strand(1)
const STRAND_B = strand(-1)
const RUNGS = [rung(0.25), rung(0.75)]

/** 내진(GENE)설계 워드마크. 얇은 GENE 글자의 N 이 보라 → 민트 이중나선으로 감겨 있음 (어두운 배경용) */
export default function GeneLogo({ className, title = '내진(GENE)설계', compact = false }: GeneLogoProps) {
  const id = useId().replace(/:/g, '')
  const grad = `gene-grad-${id}`
  const glow = `gene-glow-${id}`

  return (
    <svg
      className={className}
      viewBox={compact ? '0 0 520 170' : '0 0 520 236'}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1={N_TOP.x} y1={N_TOP.y} x2={N_BOTTOM.x} y2={N_BOTTOM.y}>
          <stop offset="0" stopColor="#c99cff" />
          <stop offset="0.5" stopColor="#8d7dff" />
          <stop offset="1" stopColor="#3fe0d6" />
        </linearGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* G · E · N 양쪽 기둥 · E: 얇은 흰 선 */}
      <g fill="none" stroke="#eef1f8" strokeWidth="9">
        <path d="M137 37 A69 69 0 1 0 151 88 H101" />
        <path d="M268 18.5 H185.5 V151.5 H268 M185.5 85 H262" />
        <path d="M300.5 14 V156M392.5 14 V156" />
        <path d="M505 18.5 H422.5 V151.5 H505 M422.5 85 H499" />
      </g>

      {/* N 의 사선: 보라 → 민트 이중나선 */}
      <g filter={`url(#${glow})`} fill="none" strokeLinecap="round">
        {RUNGS.map((d) => (
          <path key={d} d={d} stroke="rgba(238, 241, 248, 0.55)" strokeWidth="3" />
        ))}
        <path d={STRAND_B} stroke={`url(#${grad})`} strokeWidth="13" opacity="0.85" />
        <path d={STRAND_A} stroke={`url(#${grad})`} strokeWidth="13" />
      </g>

      {!compact && (
        <g
          fill="#eef1f8"
          fontFamily="'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', sans-serif"
          fontSize="40"
          fontWeight="300"
          textAnchor="middle"
        >
          <text x="66" y="222">내</text>
          <text x="196" y="222">진</text>
          <text x="326" y="222">설</text>
          <text x="456" y="222">계</text>
        </g>
      )}
    </svg>
  )
}
