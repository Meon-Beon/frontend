import { useEffect, useRef, useState } from 'react'
import styles from './style.module.css'

/*
 * GENE DATA PRINT 카드
 * 흩어져 있던 데이터 점들이 모여, 가운데가 빈 동심원 코드(패스코드 마크처럼 끊긴 호들)로 맞춰짐.
 * 링마다 호의 길이·끊긴 자리가 달라서 "나만의 무늬"처럼 보이고, 다 모이면 링이 서로 반대로 천천히 돎.
 * '다시 보기'를 누르면 처음부터 다시 모임.
 */

type Props = { className?: string }

/** 링 개수와 크기: 가장 안쪽 링 안은 비워 둠 */
const RINGS = 6
const INNER = 0.34 // 카드 반지름 대비 가장 안쪽 링
const STEP = 0.105 // 링 사이 간격
const DOT_GAP = 7 // 호 위 점 사이 거리(px)
const ASSEMBLE_MS = 2600

/** 같은 무늬가 매번 나오도록 고정 시드 난수 */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

type Arc = { start: number; len: number }
type Dot = {
  ring: number
  angle: number
  /** 처음 흩어져 있던 자리(카드 비율 0~1) */
  sx: number
  sy: number
  delay: number
  size: number
  hue: number // 0 민트 ~ 1 보라
}

/** 링마다 끊긴 호들을 만들어 둠 (패스코드 마크처럼 길이가 제각각) */
function makeArcs(): Arc[][] {
  const rand = seeded(20261118)
  return Array.from({ length: RINGS }, () => {
    const arcs: Arc[] = []
    let a = rand() * Math.PI * 2
    const end = a + Math.PI * 2
    while (a < end - 0.2) {
      const len = 0.25 + rand() * 1.1
      const gap = 0.12 + rand() * 0.35
      arcs.push({ start: a, len: Math.min(len, end - a - 0.1) })
      a += len + gap
    }
    return arcs
  })
}

const ARCS = makeArcs()
const SPEED = [0.05, -0.035, 0.03, -0.045, 0.025, -0.02] // 링별 회전 속도(rad/s), 번갈아 반대 방향

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

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
    let dots: Dot[] = []
    let stars: { x: number; y: number; a: number }[] = []

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const rand = seeded(7 + run)
      const R = Math.min(width, height * 0.72) / 2
      dots = []
      ARCS.forEach((arcs, ring) => {
        const r = R * (INNER + ring * STEP)
        for (const arc of arcs) {
          const count = Math.max(2, Math.round((arc.len * r) / DOT_GAP))
          for (let k = 0; k <= count; k++) {
            dots.push({
              ring,
              angle: arc.start + (arc.len * k) / count,
              sx: rand(),
              sy: rand(),
              delay: rand() * 0.45,
              size: 1 + rand() * 0.9,
              hue: ring / (RINGS - 1),
            })
          }
        }
      })
      // 모이지 않고 남는 옅은 배경 점
      stars = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), a: 0.15 + rand() * 0.3 }))
    }

    const color = (hue: number, alpha: number) => {
      // 민트(94,242,230) → 보라(180,140,255)
      const r = Math.round(94 + (180 - 94) * hue)
      const g = Math.round(242 + (140 - 242) * hue)
      const b = Math.round(230 + (255 - 230) * hue)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    const draw = (elapsed: number) => {
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height * 0.4
      const R = Math.min(width, height * 0.72) / 2
      const progress = reduced ? 1 : Math.min(1, elapsed / ASSEMBLE_MS)
      const settled = reduced ? 0 : Math.max(0, elapsed - ASSEMBLE_MS) / 1000

      // 가운데 은은한 빛 (비어 있는 중심)
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * INNER)
      glow.addColorStop(0, `rgba(120, 140, 255, ${0.08 * progress})`)
      glow.addColorStop(1, 'rgba(120, 140, 255, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, R * INNER, 0, Math.PI * 2)
      ctx.fill()

      for (const s of stars) {
        ctx.fillStyle = `rgba(170, 195, 255, ${s.a * (1 - progress * 0.5)})`
        ctx.fillRect(s.x * width, s.y * height, 1.2, 1.2)
      }

      for (const d of dots) {
        const local = ease(Math.min(1, Math.max(0, (progress - d.delay) / (1 - 0.45))))
        const r = R * (INNER + d.ring * STEP)
        const a = d.angle + settled * SPEED[d.ring]
        const tx = cx + Math.cos(a) * r
        const ty = cy + Math.sin(a) * r
        const x = d.sx * width + (tx - d.sx * width) * local
        const y = d.sy * height + (ty - d.sy * height) * local
        ctx.fillStyle = color(d.hue, 0.35 + 0.6 * local)
        ctx.beginPath()
        ctx.arc(x, y, d.size * (0.8 + 0.4 * local), 0, Math.PI * 2)
        ctx.fill()
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
      if (reduced) draw(ASSEMBLE_MS)
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
      <canvas ref={ref} className={styles.canvas} role="img" aria-label="흩어진 데이터 점들이 모여 가운데가 빈 동심원 무늬가 되는 그림" />
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
