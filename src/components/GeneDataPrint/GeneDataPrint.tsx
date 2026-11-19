import { useEffect, useRef, useState } from 'react'
import styles from './style.module.css'

/*
 * GENE DATA PRINT 카드
 * 격자에 맞춰 찍힌(양자화된) 데이터 입자들이 지문 둘레에 오르트 구름처럼 둥근 껍질로 떠서 천천히 돌다가,
 * 한순간 싹 모여 픽셀로 된 지문이 됨. 다 모인 뒤엔 칸마다 은은하게 반짝임.
 * '다시 보기'를 누르면 처음부터 다시 모임.
 */

type Props = { className?: string }

type Pt = { x: number; y: number }
/** 지문 선 하나 = 끊긴 조각(점 목록)들 */
type Ridge = Pt[][]


/** 같은 무늬가 매번 나오도록 고정 시드 난수 */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * 지문 선 만들기 (단위 좌표: 가운데가 0,0, 위가 음수)
 * 뒤집힌 U자(고리형 지문)를 안쪽부터 바깥으로 겹겹이 두고, 다리 길이·끊긴 자리를 조금씩 달리해 자연스럽게.
 * gaps 는 선 전체 길이에서 비워 둘 구간(0~1)
 */
function loopRidge(a: number, legL: number, legR: number, gaps: [number, number][], drop = 0, flare = 0.14): Ridge {
  const pts: Pt[] = []
  const N = 140
  // 왼쪽 다리: 아래 → 위 (아래로 갈수록 살짝 바깥으로 벌어짐)
  for (let k = 0; k <= 30; k++) {
    const t = 1 - k / 30
    pts.push({ x: -a * (1 + flare * t * t), y: legL * t })
  }
  // 위쪽 반원: 왼쪽 → 오른쪽
  for (let k = 1; k < N - 60; k++) {
    const th = Math.PI - (Math.PI * k) / (N - 60)
    pts.push({ x: Math.cos(th) * a, y: -Math.sin(th) * a * 1.08 })
  }
  // 오른쪽 다리: 위 → 아래
  for (let k = 0; k <= 30; k++) {
    const t = k / 30
    pts.push({ x: a * (1 + flare * t * t), y: legR * t })
  }
  // 앞부분을 잘라 내는 선(바깥쪽은 왼쪽 다리가 없음)
  const body = pts.slice(Math.round(pts.length * drop))
  return cut(body, gaps)
}

/** 선의 길이 비율로 gaps 구간을 비우고 남은 조각들로 나눔 */
function cut(pts: Pt[], gaps: [number, number][]): Ridge {
  const len: number[] = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = len[len.length - 1]
  const inGap = (i: number) => gaps.some(([s, e]) => len[i] / total >= s && len[i] / total <= e)
  const parts: Pt[][] = []
  let cur: Pt[] = []
  pts.forEach((p, i) => {
    if (inGap(i)) {
      if (cur.length > 2) parts.push(cur)
      cur = []
    } else cur.push(p)
  })
  if (cur.length > 2) parts.push(cur)
  return parts
}

/** 정갈한 지문: 가운데 짧은 심 + 고리 6겹 + 바깥 윗부분 호 */
const RIDGES: Ridge[] = [
  // 가운데 심 (살짝 기운 짧은 세로선)
  [
    Array.from({ length: 20 }, (_, k) => {
      const t = k / 19
      return { x: -0.01 + 0.035 * t, y: -0.02 + 0.36 * t }
    }),
  ],
  loopRidge(0.12, 0.46, 0.18, [[0.9, 1]]),
  loopRidge(0.235, 0.6, 0.42, [[0.2, 0.26]]),
  loopRidge(0.35, 0.7, 0.62, [[0.62, 0.7]]),
  loopRidge(0.465, 0.66, 0.78, [
    [0.06, 0.13],
    [0.83, 0.88],
  ]),
  loopRidge(0.58, 0.5, 0.86, [[0.4, 0.46]], 0.08),
  loopRidge(0.695, 0.3, 0.8, [[0.66, 0.73]], 0.14),
  // 바깥 윗부분 호 두 줄
  loopRidge(0.81, 0, 0.36, [[0.52, 0.6]], 0.3, 0),
  loopRidge(0.925, 0, 0.08, [[0.35, 0.42]], 0.42, 0),
]

export default function GeneDataPrint({ className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [run, setRun] = useState(0)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    let width = 0
    let height = 0
    let cx = 0
    let cy = 0
    let R = 0
    let cell = 4 // 양자화 격자 한 칸(px): 모든 입자는 이 격자에 딱 맞춰 찍힘
    /**
     * 입자 하나: 구름(오르트 구름처럼 지문을 멀찍이 둘러싼 껍질) 위 자리 + 지문 위 도착 자리
     * theta·phi 는 구 껍질 위 각도, shell 은 껍질 두께 안에서의 거리
     */
    type Dot = { tx: number; ty: number; theta: number; phi: number; shell: number; delay: number; hue: number; tw: number }
    let dots: Dot[] = []

    const snap = (v: number) => Math.round(v / cell) * cell

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      cx = width / 2
      cy = height * 0.4
      R = Math.min(width * 0.36, height * 0.27)
      cell = Math.max(3, Math.round(R * 0.032))
      const rand = seeded(7 + run)

      // 지문 선을 격자 칸 단위로 훑어 도착 자리를 만듦 (같은 칸은 한 번만)
      const seen = new Set<string>()
      dots = []
      for (const ridge of RIDGES) {
        for (const part of ridge) {
          for (let i = 1; i < part.length; i++) {
            const ax = cx + part[i - 1].x * R
            const ay = cy + part[i - 1].y * R
            const bx = cx + part[i].x * R
            const by = cy + part[i].y * R
            const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (cell * 0.6)))
            for (let k = 0; k < steps; k++) {
              const x = snap(ax + ((bx - ax) * k) / steps)
              const y = snap(ay + ((by - ay) * k) / steps)
              const key = `${x},${y}`
              if (seen.has(key)) continue
              seen.add(key)
              dots.push({
                tx: x,
                ty: y,
                theta: rand() * Math.PI * 2,
                phi: Math.acos(2 * rand() - 1),
                shell: 1.08 + rand() * 0.3,
                delay: rand() * 0.35,
                hue: Math.min(1, Math.max(0, (y - (cy - R)) / (R * 2))),
                tw: rand() * Math.PI * 2,
              })
            }
          }
        }
      }
    }

    /** 위(보라) → 아래(민트) */
    const color = (hue: number, alpha: number) => {
      const r = Math.round(180 + (94 - 180) * hue)
      const g = Math.round(140 + (242 - 140) * hue)
      const b = Math.round(255 + (230 - 255) * hue)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    /** 구름 위 자리: 구 껍질이 천천히 돌고, 살짝 기울여 내려다본 모습으로 화면에 투영 */
    const cloudAt = (d: Dot, sec: number) => {
      const spin = d.theta + sec * 0.35
      const x3 = Math.sin(d.phi) * Math.cos(spin)
      const y3 = Math.cos(d.phi)
      const z3 = Math.sin(d.phi) * Math.sin(spin)
      const tilt = 0.45
      const y = y3 * Math.cos(tilt) - z3 * Math.sin(tilt)
      const z = y3 * Math.sin(tilt) + z3 * Math.cos(tilt)
      const r = R * d.shell
      return { x: cx + x3 * r, y: cy + y * r * 0.82, depth: (z + 1) / 2 }
    }

    const CLOUD_MS = 1700 // 구름으로 떠 있는 시간
    const GATHER_MS = 1000 // 싹 모이는 시간
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

    const draw = (elapsed: number) => {
      ctx.clearRect(0, 0, width, height)
      const sec = elapsed / 1000
      const gather = reduced ? 1 : Math.min(1, Math.max(0, (elapsed - CLOUD_MS) / GATHER_MS))
      const appear = reduced ? 1 : Math.min(1, elapsed / 500) // 처음 구름이 떠오르는 정도
      const settled = reduced ? 0 : Math.max(0, elapsed - CLOUD_MS - GATHER_MS) / 1000

      // 가운데 은은한 빛: 모일수록 짙어짐
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3)
      glow.addColorStop(0, `rgba(110, 120, 255, ${0.04 + 0.12 * gather})`)
      glow.addColorStop(1, 'rgba(110, 120, 255, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      for (const d of dots) {
        const local = easeInOut(Math.min(1, Math.max(0, (gather - d.delay) / (1 - 0.35))))
        const c = cloudAt(d, sec)
        const x = snap(c.x + (d.tx - c.x) * local)
        const y = snap(c.y + (d.ty - c.y) * local)
        // 구름일 땐 앞쪽 입자가 더 밝고, 모이면 고르게 밝아짐. 다 모인 뒤엔 칸마다 살짝 반짝임
        const cloudAlpha = 0.25 + 0.55 * c.depth
        const twinkle = settled > 0 ? 0.82 + 0.18 * Math.sin(settled * 3 + d.tw) : 1
        const alpha = appear * (cloudAlpha + (0.95 - cloudAlpha) * local) * twinkle
        const size = cell * (0.55 + 0.25 * local) * (0.8 + 0.4 * (1 - local) * c.depth)
        ctx.fillStyle = color(local > 0.5 ? d.hue : c.depth, alpha)
        ctx.fillRect(x - size / 2, y - size / 2, size, size)
      }
    }

    build()
    let frame = 0
    let visible = true
    const start = performance.now()
    const tick = (now: number) => {
      draw(now - start)
      if (visible && !reduced) frame = requestAnimationFrame(tick)
    }
    draw(0)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      cancelAnimationFrame(frame)
      if (visible && !reduced) frame = requestAnimationFrame(tick)
      if (reduced) draw(0)
    })
    observer.observe(canvas)
    const onResize = () => {
      build()
      draw(performance.now() - start)
    }
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [run])

  return (
    <section className={`${styles.card}${className ? ` ${className}` : ''}`} aria-label="GENE DATA PRINT">
      <canvas ref={ref} className={styles.canvas} role="img" aria-label="구름처럼 떠 있던 데이터 입자들이 모여 지문 무늬가 되는 그림" />
      <header className={styles.head}>
        <span className={styles.tag}>GENE DATA PRINT</span>
        <button type="button" className={styles.replay} onClick={() => setRun((n) => n + 1)}>
          다시 보기
        </button>
      </header>
      <div className={styles.body}>
        <h2 className={styles.title}>
          데이터가 모여,
          <br />
          <em>오직 나만의 분석 결과</em>가 됩니다
        </h2>
        <p className={styles.desc}>
          지문처럼 같은 결과는 없습니다.
          <br />내 유전·건강 데이터가 만드는 고유한 분석이에요.
        </p>
      </div>
    </section>
  )
}
