import { useEffect, useRef, type RefObject } from 'react'
import styles from './DnaFlow.module.css'

/**
 * 히어로 왼쪽의 세로 DNA가 스크롤을 따라 아래로 흘러 내려오다 휘어져 가로 이중나선으로 바뀌는 구간.
 * 화면(sticky)은 고정되고, 이 구간을 스크롤한 거리를 애니메이션 진행도(0~1)로 씀.
 *  - 0 ~ 0.08 : 페이지 배경의 세로 나선(DnaHelix)과 같은 자리에서 자연스럽게 바통 터치
 *  - 0.05 ~ 0.6 : 꺾이는 지점이 아래에서 올라오며 세로 → 가로로 휘어짐, 염기쌍에 A·T·G·C 색이 입혀짐
 *  - 0.5 ~ 1 : 가로 나선이 돌며 흐르고, 위·아래로 염기서열 글자가 서로 반대로 흘러감
 */

const COMP: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' }
/** 염기 색: 빨 · 노 · 초 · 파. 페이지의 청록·보라 네온 톤에 맞춰 살짝 파스텔로 */
const COLOR: Record<string, [number, number, number]> = {
  A: [255, 138, 160],
  T: [255, 214, 128],
  G: [110, 231, 160],
  C: [120, 170, 255],
}
/** 두 가닥 색: 민트 가닥과 보라 가닥이 서로 감김 (위 배경 나선과 같은 청록·보라) */
const TEAL: [number, number, number] = [94, 242, 230]
const VIOLET: [number, number, number] = [180, 140, 255]
const PEARL: [number, number, number] = [222, 240, 248]

/** 같은 자리의 점이 매 프레임 같은 곳에 찍히도록 하는 고정 난수(0~1) */
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}

// 매번 같은 서열이 나오도록 간단한 시드 난수
let seed = 7
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const SEQ = Array.from({ length: 120 }, () => 'ATGC'[Math.floor(rand() * 4)])

const SPACING = 34 // 염기쌍 사이 간격(px)
const TWIST = 0.36 // 염기쌍마다 비틀리는 각도(rad) ≈ 10.5쌍에 한 바퀴
const K = TWIST / SPACING // 길이 1px 당 회전각
const AUTO_SPEED = 0.9 // 스크롤 안 해도 계속 도는 속도(rad/초)

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mix3 = (c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] => {
  const k = clamp01(t)
  return [Math.round(lerp(c1[0], c2[0], k)), Math.round(lerp(c1[1], c2[1], k)), Math.round(lerp(c1[2], c2[2], k))]
}

type Props = {
  /** 바통 터치할 페이지 배경 나선. 이 요소의 가로 가운데에서 세로 나선이 시작됨 */
  helixRef: RefObject<HTMLElement | null>
  /** 배경 나선을 감출 정도(--dna-handoff, 0~1)를 넘겨 줄 페이지 요소 */
  pageRef: RefObject<HTMLElement | null>
}

export default function DnaFlow({ helixRef, pageRef }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const welcomeRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const seqTop = topRef.current
    const seqBottom = bottomRef.current
    const overlay = overlayRef.current
    const welcome = welcomeRef.current
    if (!section || !canvas || !ctx || !seqTop || !seqBottom || !overlay || !welcome) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // 스크롤 → 진행도. 바로 쓰지 않고 current 가 target 을 부드럽게 따라감
    let target = 0
    let current = 0
    const readScroll = () => {
      const sticky = canvas.parentElement as HTMLElement
      const r = section.getBoundingClientRect()
      const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0
      const total = section.offsetHeight - sticky.offsetHeight
      target = total > 0 ? clamp01((stickyTop - r.top) / total) : 0
    }
    readScroll()
    window.addEventListener('scroll', readScroll, { passive: true })

    /** 세로 → 휨 → 가로 로 이어지는 길 위의 한 점과 진행 방향 */
    const pathAt = (s: number, X: number, Y: number, Rb: number, top: number) => {
      const lv = Y - Rb - top // 세로 구간 길이
      const la = (Math.PI / 2) * Rb // 휘는 구간 길이
      if (s <= lv) return { x: X, y: top + s, tx: 0, ty: 1 }
      if (s <= lv + la) {
        const a = Math.PI - (s - lv) / Rb
        return { x: X + Rb + Rb * Math.cos(a), y: Y - Rb + Rb * Math.sin(a), tx: Math.sin(a), ty: -Math.cos(a) }
      }
      return { x: X + Rb + (s - lv - la), y: Y, tx: 1, ty: 0 }
    }

    let angle = 0
    const draw = (p: number) => {
      ctx.clearRect(0, 0, W, H)
      const canvasRect = canvas.getBoundingClientRect()
      const helixRect = helixRef.current?.getBoundingClientRect()
      const X0 = helixRect ? helixRect.left + helixRect.width / 2 - canvasRect.left : W * 0.28

      const handoff = smooth(0, 0.08, p) // 배경 나선과 바통 터치
      const bend = smooth(0.05, 0.6, p) // 세로 → 가로
      const color = smooth(0.12, 0.5, p) // 흰 막대 → 염기 색

      const Rb = H * 0.34 // 휘는 반지름
      // 먼저 꺾이는 곳이 아래에서 올라와 L자가 되고, 그다음 세로 부분이 왼쪽으로 빠지며 완전히 가로가 됨
      const X = lerp(X0, -Rb - 60, smooth(0.45, 1, bend))
      const Y = lerp(H + Rb + 120, H * 0.5, smooth(0, 0.7, bend))
      const top = -200
      const R = lerp(Math.min(H * 0.16, 128), Math.min(H * 0.17, 130), bend) // 나선 반지름
      const flow = p * H * 2.2 // 스크롤할수록 길을 따라 흘러감
      const rotation = angle + p * Math.PI * 6
      const totalLen = Y - Rb - top + (Math.PI / 2) * Rb + (W - X - Rb) + 200

      // 가운데에 가까울수록 밝게(가로가 된 뒤에만), 화면 가장자리는 흐리게
      const focus = (x: number) => 1 - Math.min(Math.abs(x - W / 2) / (W * 0.6), 1) * 0.75 * bend
      const edge = (x: number, y: number) =>
        Math.min(clamp01((y + 10) / (H * 0.18)), clamp01((H - y + 10) / (H * 0.18)), clamp01((x + 10) / 90), clamp01((W - x + 10) / 90))
      const fade = (x: number, y: number) => focus(x) * edge(x, y)

      const master = handoff * lerp(0.75, 1, bend)
      const thick = R * 0.09 // 가닥 굵기(점구름 두께)
      const labels: { x: number; y: number; z: number; b: string }[] = []

      // 점구름은 빛을 더하는 방식으로 찍어 겹칠수록 환하게 (위 배경 나선과 같은 느낌)
      ctx.globalCompositeOperation = 'lighter'

      // (a) 두 가닥 + 주변 먼지: 촘촘한 빛 점들
      for (let s = 0; s < totalLen; s += 3) {
        const pt = pathAt(s, X, Y, Rb, top)
        if (pt.x < -30 || pt.x > W + 30 || pt.y < -30 || pt.y > H + 30) continue
        const th = (s - flow) * K + rotation
        const nx = -pt.ty
        const ny = pt.tx
        const id = Math.round(s - flow)
        for (let strand = 0; strand < 2; strand++) {
          const ang = th + strand * Math.PI
          const off = R * Math.sin(ang)
          const z = Math.cos(ang)
          const depth = (z + 1) / 2
          const f = fade(pt.x + nx * off, pt.y + ny * off)
          if (f <= 0.01) continue
          // 한 가닥은 민트, 다른 가닥은 보라. 앞으로 올수록 살짝 밝게
          const hue = strand === 0 ? TEAL : VIOLET
          const [r, g, b] = mix3(hue, PEARL, Math.max(depth - 0.6, 0) * 0.8)
          ctx.fillStyle = `rgb(${r},${g},${b})`
          for (let j = 0; j < 5; j++) {
            const h1 = hash(id * 3.1 + j * 17 + strand * 91)
            const h2 = hash(id * 5.7 + j * 29 + strand * 53)
            const jn = (h1 - 0.5) * 2 * thick
            const jt = (h2 - 0.5) * 2 * thick
            const x = pt.x + nx * (off + jn) + pt.tx * jt
            const y = pt.y + ny * (off + jn) + pt.ty * jt
            const size = 1 + depth * 1.4
            ctx.globalAlpha = master * f * (0.22 + depth * 0.55)
            ctx.fillRect(x - size / 2, y - size / 2, size, size)
          }
        }
        // 나선을 감싸는 먼지
        if (id % 6 === 0) {
          const da = hash(id * 1.3) * Math.PI * 2 + rotation * 0.5
          const dr = R * (1.08 + hash(id * 2.9) * 0.35)
          const x = pt.x + nx * dr * Math.sin(da)
          const y = pt.y + ny * dr * Math.sin(da)
          ctx.globalAlpha = master * fade(x, y) * 0.35
          ctx.fillStyle = hash(id) > 0.5 ? 'rgb(94,242,230)' : 'rgb(180,140,255)'
          ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4)
        }
      }

      // (b) 염기쌍: 두 가닥을 잇는 점선 막대. 흰 진주빛에서 시작해 반쪽씩 염기 색으로 물듦
      const first = Math.floor(flow / SPACING) - 1
      for (let i = first; i * SPACING - flow < totalLen; i++) {
        const s = i * SPACING - flow
        if (s < 0) continue
        const pt = pathAt(s, X, Y, Rb, top)
        if (pt.x < -40 || pt.x > W + 40 || pt.y < -40 || pt.y > H + 40) continue
        const base = SEQ[((i % SEQ.length) + SEQ.length) % SEQ.length]
        const th = (s - flow) * K + rotation
        const nx = -pt.ty
        const ny = pt.tx
        const o1 = R * Math.sin(th)
        const z1 = Math.cos(th)
        const f = fade(pt.x, pt.y)
        if (f <= 0.01) continue
        const len = Math.abs(o1) * 2
        const dots = Math.max(2, Math.round(len / 4))
        for (let k = 0; k <= dots; k++) {
          const t = k / dots
          const b = t < 0.5 ? base : COMP[base]
          const [r, g, bl] = mix3(PEARL, COLOR[b], color)
          const o = lerp(o1, -o1, t)
          ctx.globalAlpha = master * f * 0.55
          ctx.fillStyle = `rgb(${r},${g},${bl})`
          ctx.fillRect(pt.x + nx * o - 0.9, pt.y + ny * o - 0.9, 1.8, 1.8)
        }
        labels.push({ x: pt.x + nx * o1, y: pt.y + ny * o1, z: z1, b: base })
        labels.push({ x: pt.x - nx * o1, y: pt.y - ny * o1, z: -z1, b: COMP[base] })
      }

      // (c) 앞쪽을 향한 염기만 빛나는 글자로 표시
      ctx.globalCompositeOperation = 'source-over'
      if (color > 0) {
        ctx.font = '800 13px Pretendard, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (const l of labels) {
          if (l.z < 0.45) continue
          const a = ((l.z - 0.45) / 0.55) * color * master * fade(l.x, l.y) * 0.75
          if (a <= 0.01) continue
          const [r, g, b] = COLOR[l.b]
          ctx.globalAlpha = a
          ctx.shadowColor = `rgba(${r},${g},${b},0.6)`
          ctx.shadowBlur = 8
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillText(l.b, l.x, l.y + 0.5)
        }
        ctx.shadowBlur = 0
      }
      ctx.globalAlpha = 1

      // 페이지 배경 나선은 바통 터치가 끝나면 사라짐
      pageRef.current?.style.setProperty('--dna-handoff', handoff.toFixed(3))

      // 가로가 된 뒤 위·아래 염기서열 글자가 서로 반대 방향으로 흐름
      const q = smooth(0.45, 1, p)
      overlay.style.opacity = smooth(0.45, 0.65, p).toFixed(3)
      seqTop.style.transform = `translateX(${-q * (seqTop.scrollWidth - W)}px)`
      seqBottom.style.transform = `translateX(${-(1 - q) * (seqBottom.scrollWidth - W)}px)`
    }

    // 화면 근처에 있을 때만 그림
    let visible = false
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    }, { rootMargin: '200px 0px' })
    observer.observe(section)

    /* 가로 나선이 다 펼쳐지면 한 번만: 0.5초 돌다가 문구 두 개가 차례로 떴다 사라지고, 다시 2초 동안 돎.
       스크롤은 막지 않아서 사용자가 언제든 계속 내려갈 수 있음 */
    const WAIT = 0.5
    const FADE_IN = 0.6
    const HOLD = 1.3
    const FADE_OUT = 0.6
    const SPIN_AFTER = 2
    const MESSAGES = ['내진설계에 오신 것을 환영합니다', '여러분께 정성을 다하겠습니다.']
    const ONE = FADE_IN + HOLD + FADE_OUT // 문구 하나가 머무는 시간
    const TOTAL = WAIT + ONE * MESSAGES.length + SPIN_AFTER
    let welcomeStart = -1 // -1: 아직, 0 이상: 시작 시각(ms)
    let welcomeDone = false
    const runWelcome = (now: number) => {
      if (welcomeDone) return
      if (welcomeStart < 0) {
        if (current < 0.6) return
        welcomeStart = now
      }
      const t = (now - welcomeStart) / 1000
      // 지금 몇 번째 문구인지, 그 문구 안에서 몇 초 지났는지
      const k = Math.floor((t - WAIT) / ONE)
      const local = t - WAIT - k * ONE
      let o = 0
      if (t > WAIT && k < MESSAGES.length) {
        if (welcome.textContent !== MESSAGES[k]) welcome.textContent = MESSAGES[k]
        if (local < FADE_IN) o = local / FADE_IN
        else if (local < FADE_IN + HOLD) o = 1
        else o = 1 - (local - FADE_IN - HOLD) / FADE_OUT
      }
      welcome.style.opacity = o.toFixed(3)
      welcome.style.transform = `translate(-50%, calc(-50% + ${((1 - o) * 10).toFixed(1)}px))`
      if (t >= TOTAL) {
        welcomeDone = true
        welcome.style.opacity = '0'
      }
    }

    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (visible) {
        // 스크롤이 빠를수록 잠깐 더 빨리 돎
        if (!reduce) angle += (AUTO_SPEED + Math.abs(target - current) * 60) * dt
        current += (target - current) * (reduce ? 1 : 0.1)
        if (Math.abs(target - current) < 0.0001) current = target
        draw(current)
        runWelcome(now)
      } else {
        // 구간 위쪽(아직 도착 전)이면 배경 나선을 다시 보이게
        current = target
        pageRef.current?.style.setProperty('--dna-handoff', target > 0 ? '1' : '0')
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', readScroll)
    }
  }, [helixRef, pageRef])

  const strand = (arr: string[]) =>
    arr.map((b, k) => (
      <b key={k} className={styles[b]}>
        {b}
      </b>
    ))

  return (
    <section ref={sectionRef} className={styles.flow} aria-label="세로 유전자 나선이 가로로 휘어지며 염기서열을 보여 주는 애니메이션">
      <div className={styles.sticky}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <p ref={welcomeRef} className={styles.welcome}>
          내진설계에 오신 것을 환영합니다
        </p>
        <div ref={overlayRef} className={styles.overlay} aria-hidden="true">
          <div ref={topRef} className={`${styles.seq} ${styles.seqTop}`}>
            {strand(SEQ)}
          </div>
          <div ref={bottomRef} className={`${styles.seq} ${styles.seqBottom}`}>
            {strand(SEQ.map((b) => COMP[b]))}
          </div>
        </div>
      </div>
    </section>
  )
}
