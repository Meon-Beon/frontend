import { useEffect, useRef, useState, type CSSProperties } from 'react'
import styles from './IntroTree.module.css'

/**
 * 인트로 진입 애니메이션 — "당신이 태어나기까지 몇 명이 필요했을까"
 * 나무 전체가 처음부터 희미하게 보이고, 단 하나의 점(당신)에서
 * 가지가 위로 타고 올라가며 둘씩 갈라져 8,192명의 조상까지 닿는다.
 */

const GENS = 13 // 2^13 = 8,192명
const YEAR_NOW = 2026
const YEARS_PER_GEN = 27

// 타임라인 (ms)
const GROW = 6000 // 가지가 아래(당신)에서 위(조상)로 타고 올라가는 시간
const BLOOM = 2800 // 다 올라간 뒤 나무 전체가 빛나는 시간 → 이후 DNA가 솟아 클릭을 기다림
const LAST_CAPTION_HOLD = 1300 // 마지막 자막을 다 올라간 뒤에도 더 보여주는 시간

// 자막: 가지가 올라가는 시간(GROW) 중 몇 % 지점에서 바뀌는지
// 4번째 자막은 숫자가 1,024(10세대)를 넘는 순간과 맞춤
const CAPTIONS = [
  { at: 0, text: '내가 태어나기까지 얼마나 많은 조상이 있었을까?' },
  { at: 0.22, text: '한세대씩 거슬러 올라갈 때마다' },
  { at: 0.42, text: '숫자가 두배씩 늘어가고' },
  { at: 0.62, text: '10세대 전에는 1천명이 넘고' },
  { at: 0.84, text: '20세대 전에는 100만명' },
]
const GHOST_ALPHA = 0.16 // 처음부터 보이는 나무 전체 윤곽의 밝기
const MAX_ZOOM = 5 // 처음 클로즈업 배율 — 가지가 올라갈수록 1배(전체 모습)까지 물러남
const LIVE_LEVELS = 9 // 이 세대까지는 매 프레임 확대 배율에 맞춰 선명하게 다시 그림
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

/** thin: 확대 중일 때 선이 너무 두꺼워지지 않도록 나누는 값 */
function drawLevel(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  k: number,
  t: number,
  heads: boolean,
  thin = 1,
) {
  const n = 2 ** k
  const { width, alpha } = lineStyle(L, k)
  ctx.lineWidth = width / thin
  ctx.strokeStyle = levelColor(k, alpha)
  ctx.beginPath()
  const ends: Pt[] = []
  for (let i = 0; i < n; i++) {
    // 자녀 쪽(아래)에서 조상 쪽(위)으로 그리도록 곡선을 뒤집음
    const [p0, p1, p2, p3] = edge(L, k, i)
    ends.push(partialCurve(ctx, [p3, p2, p1, p0], t))
  }
  ctx.stroke()

  if (heads && t < 1) {
    // 타고 올라가는 가지 끝의 빛 알갱이
    const r = Math.max(0.8, 2.6 - (k / GENS) * 1.8) / thin
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
  const [caption, setCaption] = useState(0) // -1 이면 자막 숨김

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // 끝난 세대는 따로 그려두고 매 프레임 복사만 함
    const cache = document.createElement('canvas')
    const cctx = cache.getContext('2d')!
    // 나무 전체 모습 — 처음부터 끝까지 희미하게 깔려 있음
    const ghost = document.createElement('canvas')
    const gctx = ghost.getContext('2d')!
    let L = makeLayout(1, 1)
    let dpr = 1
    let cached = 0 // 캐시에 그려진 세대 수 (아래 당신부터)

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      for (const c of [canvas, cache, ghost]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
      }
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      L = makeLayout(w, h)
      cached = 0
      for (const c of [cctx, gctx]) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0)
        c.lineCap = 'round'
        c.globalCompositeOperation = 'lighter'
      }
      for (let k = 1; k <= GENS; k++) drawLevel(gctx, L, k, 1, false)
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
    let lastCaption = 0
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

      // 자막 바꾸기
      let cap = -1
      if (el < GROW + LAST_CAPTION_HOLD) {
        for (let n = 0; n < CAPTIONS.length; n++) if (g >= CAPTIONS[n].at) cap = n
      }
      if (cap !== lastCaption) {
        lastCaption = cap
        setCaption(cap)
      }

      // 올라간 세대 수 (0 ~ GENS)
      const f = easeInOut(g) * GENS
      const done = Math.floor(f)
      const frac = f - done

      // 위쪽 세대는 캐시에 누적 (이때쯤이면 거의 전체 화면이라 확대해도 흐려지지 않음)
      while (cached < Math.min(done, GENS)) {
        cached++
        if (cached > LIVE_LEVELS) drawLevel(cctx, L, cached, 1, false)
      }

      // 카메라: '당신' 점을 고정한 채, 가지 끝이 화면 위쪽에 오도록 배율을 맞춤
      const you = { x: L.w / 2, y: L.botY }
      const zoom = Math.min(MAX_ZOOM, Math.max(1, GENS / Math.min(GENS, f + 1.3)))
      const thin = zoom ** 0.6
      const ox = you.x * (1 - zoom)
      const oy = you.y * (1 - zoom)
      const toScreenY = (y: number) => you.y + (y - you.y) * zoom

      const b = el - GROW
      const drawGrown = (alpha: number) => {
        ctx.globalAlpha = alpha
        ctx.setTransform(zoom, 0, 0, zoom, ox * dpr, oy * dpr)
        ctx.drawImage(cache, 0, 0)
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, ox * dpr, oy * dpr)
        for (let k = 1; k <= Math.min(done, LIVE_LEVELS); k++) drawLevel(ctx, L, k, 1, false, thin)
        ctx.globalAlpha = 1
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.lineCap = 'round'
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = GHOST_ALPHA
      ctx.setTransform(zoom, 0, 0, zoom, ox * dpr, oy * dpr)
      ctx.drawImage(ghost, 0, 0)
      ctx.globalCompositeOperation = 'lighter'
      drawGrown(1)
      // 꼭대기까지 닿으면 나무 전체가 한 번 환하게 빛남
      if (b > 0) drawGrown((1 - clamp01(b / 1200)) * 0.7)

      if (done < GENS) drawLevel(ctx, L, done + 1, easeOut(frac), true, thin)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // 왼쪽 연도 눈금 (지나온 세대만, 확대 배율에 맞춘 높이)
      const front = f
      ctx.font = '500 11px Pretendard, system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const axisX = Math.max(56, (L.w - L.topW) / 2 - 6)
      for (let k = GENS; k >= 1; k--) {
        const a = clamp01((front - k + 1) * 1.2) * 0.55
        const y = toScreenY(nodeY(L, k))
        if (a <= 0 || y < 0) continue
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

      // 당신이라는 점: 처음부터 씨앗처럼 빛나고, 다 올라간 뒤 크게 빛남
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
        aria-label="당신에게서 가지가 위로 뻗어 8,192명의 조상까지 이어지는 그림"
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
          <strong ref={countRef}>1</strong>
          <span>명</span>
        </p>
        <span ref={yearRef} className={styles.counterYear} />
      </div>

      {/* 자막 — 바뀔 때마다 새로 떠오름 */}
      {caption >= 0 && phase !== 'leave' && (
        <p key={caption} className={styles.caption} aria-live="polite">
          {CAPTIONS[caption].text}
        </p>
      )}

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
