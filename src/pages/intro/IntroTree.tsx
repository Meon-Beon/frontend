import { useEffect, useRef, useState, type CSSProperties } from 'react'
import styles from './IntroTree.module.css'

/**
 * 인트로 진입 애니메이션 — "당신이 태어나기까지 몇 명이 필요했을까"
 * 13세대 위 8,192명의 조상에서 가지가 내려오며 둘씩 합쳐지고,
 * 마지막에 단 하나의 점(당신)으로 완결된 뒤 화면이 열린다.
 */

const GENS = 13 // 2^13 = 8,192명
const YEAR_NOW = 2026
const YEARS_PER_GEN = 27

// 타임라인 (ms)
const GROW = 6000 // 가지가 위에서 아래로 내려오는 시간
const BLOOM = 1800 // 하나로 모인 뒤 빛나는 시간 → 이후 DNA가 솟아 클릭을 기다림
const LEAVE = 900 // 클릭 후 화면이 열리며 사라지는 시간
const RUNGS = 14 // DNA 염기쌍 수

const TOP_RGB = [180, 140, 255] // 보라 (먼 조상)
const BOTTOM_RGB = [94, 242, 230] // 청록 (당신)

type Pt = { x: number; y: number }

type Layout = {
  w: number
  h: number
  topY: number
  botY: number
  topW: number
}

function makeLayout(w: number, h: number): Layout {
  const topY = h * 0.22
  const botY = h * 0.72
  const topW = Math.min(w - 150, (botY - topY) * 1.9)
  return { w, h, topY, botY, topW }
}

function nodeY(L: Layout, k: number) {
  return L.botY - (L.botY - L.topY) * (k / GENS)
}

function nodeX(L: Layout, k: number, i: number) {
  if (k === 0) return L.w / 2
  const spread = L.topW * Math.pow(k / GENS, 1.35)
  return L.w / 2 + ((i + 0.5) / 2 ** k - 0.5) * spread
}

function levelColor(k: number, a: number) {
  const t = k / GENS
  const c = TOP_RGB.map((v, n) => Math.round(BOTTOM_RGB[n] + (v - BOTTOM_RGB[n]) * t))
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

/** 세대 k의 i번째 사람 → 한 세대 아래(자녀)로 이어지는 S자 곡선의 4개 제어점 */
function edge(L: Layout, k: number, i: number): [Pt, Pt, Pt, Pt] {
  const p0 = { x: nodeX(L, k, i), y: nodeY(L, k) }
  const p3 = { x: nodeX(L, k - 1, i >> 1), y: nodeY(L, k - 1) }
  const dy = p3.y - p0.y
  return [p0, { x: p0.x, y: p0.y + dy * 0.55 }, { x: p3.x, y: p3.y - dy * 0.45 }, p3]
}

const lerp = (a: Pt, b: Pt, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** 곡선의 0~t 구간만 그림 (de Casteljau 분할). 끝점을 돌려줌 */
function partialCurve(ctx: CanvasRenderingContext2D, c: [Pt, Pt, Pt, Pt], t: number): Pt {
  const [p0, p1, p2, p3] = c
  if (t >= 1) {
    ctx.moveTo(p0.x, p0.y)
    ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
    return p3
  }
  const a = lerp(p0, p1, t)
  const b = lerp(p1, p2, t)
  const d = lerp(p2, p3, t)
  const ab = lerp(a, b, t)
  const bd = lerp(b, d, t)
  const end = lerp(ab, bd, t)
  ctx.moveTo(p0.x, p0.y)
  ctx.bezierCurveTo(a.x, a.y, ab.x, ab.y, end.x, end.y)
  return end
}

/** 위로 갈수록 가늘고 흐리게 — 선이 촘촘해져도 덩어리 지지 않고 실처럼 보이도록 밀도로 보정 */
function lineStyle(L: Layout, k: number) {
  const t = k / GENS
  const perPx = 2 ** k / Math.max(1, L.topW * Math.pow(t, 1.35)) // 1px 당 선 개수
  const alpha = Math.min(0.95, Math.max(0.035, 0.55 / Math.max(perPx, 0.6)))
  return { width: 2.4 - t * 1.9, alpha }
}

function drawLevel(ctx: CanvasRenderingContext2D, L: Layout, k: number, t: number, heads: boolean) {
  const n = 2 ** k
  const { width, alpha } = lineStyle(L, k)
  ctx.lineWidth = width
  ctx.strokeStyle = levelColor(k, alpha)
  ctx.beginPath()
  const ends: Pt[] = []
  for (let i = 0; i < n; i++) {
    ends.push(partialCurve(ctx, edge(L, k, i), t))
  }
  ctx.stroke()

  if (heads && t < 1) {
    // 내려오는 가지 끝의 빛 알갱이
    const r = Math.max(0.8, 2.6 - (k / GENS) * 1.8)
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, alpha * 3)})`
    for (const p of ends) ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r)
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const easeOut = (t: number) => 1 - (1 - t) ** 3
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

type Phase = 'grow' | 'bloom' | 'ready' | 'leave'

export default function IntroTree({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const countRef = useRef<HTMLElement>(null)
  const yearRef = useRef<HTMLSpanElement>(null)
  const leaveRef = useRef<() => void>(() => {})
  const [phase, setPhase] = useState<Phase>('grow')

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // 끝난 세대는 따로 그려두고 매 프레임 복사만 함
    const cache = document.createElement('canvas')
    const cctx = cache.getContext('2d')!
    let L = makeLayout(1, 1)
    let dpr = 1
    let cached = 0 // 캐시에 그려진 세대 수 (위에서부터)

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      for (const c of [canvas, cache]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
      }
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      L = makeLayout(w, h)
      cached = 0
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cctx.lineCap = 'round'
      cctx.globalCompositeOperation = 'lighter'
    }
    resize()
    window.addEventListener('resize', resize)

    // 인트로 동안 스크롤 잠금
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    window.scrollTo(0, 0)

    const start = performance.now()
    let raf = 0
    let current: Phase = 'grow'
    let lastCount = -1
    let leaveTimer = 0

    const go = (p: Phase) => {
      if (current === p) return
      current = p
      setPhase(p)
    }

    // DNA 클릭(또는 건너뛰기) → 화면이 열리며 인트로 페이지로
    leaveRef.current = () => {
      if (current === 'leave') return
      go('leave')
      leaveTimer = window.setTimeout(onDone, LEAVE)
    }

    const yearLabel = (k: number) => (k === 0 ? '지금, 당신' : `${YEAR_NOW - k * YEARS_PER_GEN}년 · ${k}세대 전`)

    const frame = (now: number) => {
      const el = now - start
      const g = clamp01(el / GROW)
      // 내려온 세대 수 (0 ~ GENS)
      const f = easeInOut(g) * GENS
      const done = Math.floor(f)
      const frac = f - done

      // 다 그린 세대는 캐시에 누적
      while (cached < Math.min(done, GENS)) {
        drawLevel(cctx, L, GENS - cached, 1, false)
        cached++
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(cache, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.globalCompositeOperation = 'lighter'

      if (done < GENS) drawLevel(ctx, L, GENS - done, easeOut(frac), true)

      // 왼쪽 연도 눈금 (지나온 세대만)
      const front = GENS - f
      ctx.font = '500 11px Pretendard, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const axisX = Math.max(56, (L.w - L.topW) / 2 - 6)
      for (let k = GENS; k >= 1; k--) {
        const a = clamp01((k - front + 1) * 1.2) * 0.55
        if (a <= 0) continue
        const y = nodeY(L, k)
        ctx.fillStyle = `rgba(200,210,235,${a})`
        ctx.fillText(String(YEAR_NOW - k * YEARS_PER_GEN), axisX - 10, y)
        ctx.fillRect(axisX - 4, y - 0.5, 8, 1)
      }

      // 위쪽 숫자: 지금 가지 끝에 있는 사람 수
      const k = Math.max(0, Math.round(front))
      const count = 2 ** k
      if (count !== lastCount) {
        lastCount = count
        if (countRef.current) countRef.current.textContent = count.toLocaleString('ko-KR')
        if (yearRef.current) yearRef.current.textContent = yearLabel(k)
      }

      // 하나로 모인 뒤: 당신이라는 점이 빛남
      const b = el - GROW
      const you = { x: L.w / 2, y: L.botY }
      const pulse = clamp01(b / 900)
      const glowR = 8 + easeOut(pulse) * 70
      const grad = ctx.createRadialGradient(you.x, you.y, 0, you.x, you.y, glowR)
      grad.addColorStop(0, 'rgba(255,255,255,0.95)')
      grad.addColorStop(0.18, levelColor(0, 0.8))
      grad.addColorStop(1, levelColor(0, 0))
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(you.x, you.y, glowR, 0, Math.PI * 2)
      ctx.fill()

      if (b > 0) {
        // 퍼져나가는 빛의 고리 두 번
        for (const delay of [0, 380]) {
          const q = clamp01((b - delay) / 1500)
          if (q <= 0 || q >= 1) continue
          ctx.strokeStyle = levelColor(0, (1 - q) * 0.7)
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(you.x, you.y, 10 + easeOut(q) * 180, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      if (el >= GROW + BLOOM) {
        // 그림은 완성 — 이제 DNA를 띄우고 클릭을 기다림 (그리기 루프 종료)
        if (current !== 'leave') go('ready')
        return
      }
      if (el >= GROW && current === 'grow') go('bloom')

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leaveRef.current()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(leaveTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKey)
      html.style.overflow = prevOverflow
    }
  }, [onDone])

  const cls = [
    styles.overlay,
    phase !== 'grow' && styles.bloom,
    (phase === 'ready' || phase === 'leave') && styles.ready,
    phase === 'leave' && styles.leave,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="8,192명의 조상으로부터 가지가 내려와 하나의 당신으로 이어지는 그림"
      />

      {/* 하나로 모인 자리에서 솟아오르는 DNA — 누르면 인트로 페이지로 */}
      {(phase === 'ready' || phase === 'leave') && (
        <button
          type="button"
          className={styles.dna}
          onClick={() => leaveRef.current()}
          aria-label="DNA를 눌러 인트로 페이지로 들어가기"
          autoFocus
        >
          {Array.from({ length: RUNGS }, (_, i) => (
            <i key={i} style={{ '--i': i } as CSSProperties}>
              <b />
            </i>
          ))}
        </button>
      )}

      <div className={styles.counter}>
        <p className={styles.counterCaption}>당신이 태어나기까지 필요했던 사람</p>
        <p className={styles.counterValue}>
          <strong ref={countRef}>8,192</strong>
          <span>명</span>
        </p>
        <span ref={yearRef} className={styles.counterYear} />
      </div>

      <div className={styles.you}>
        <span className={styles.youLabel}>YOU</span>
        <p className={styles.message}>
          8,192명의 유전자가 이어져
          <br />
          <b>단 하나의 당신</b>이 되었습니다.
        </p>
        <p className={styles.hint}>DNA를 눌러 시작하기</p>
      </div>

      {phase !== 'ready' && phase !== 'leave' && (
        <button type="button" className={styles.skip} onClick={() => leaveRef.current()}>
          건너뛰기
        </button>
      )}
    </div>
  )
}
