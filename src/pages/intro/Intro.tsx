import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from 'react'
import IntroTree from './IntroTree'
import DnaFlow from './DnaFlow'
import { Link } from 'react-router-dom'
import DnaHelix from '../../components/dna-helix/DnaHelix'
import GeneLogo from '../../components/GeneLogo/GeneLogo'
import { LAND_POINTS } from './landPoints'
import styles from './style.module.css'

/** 숫자로 보는 내진설계. 첫 항목은 오른쪽 위에 크게, 나머지는 그 아래 작은 칸 */
const stats = [
  { label: '유전정보 추가 결과 식별률 향상', value: '+47.7', unit: '%', desc: 'European Heart Journal 연구 결과 | 심혈관질환' },
  { label: '비교 연계 보험사', value: '50', unit: '사', desc: '생·손보 통합 데이터' },
  { label: '정밀 진단 소요시간', value: '3', unit: '분', desc: '실시간 다차원 스캔' },
  { label: '유전정보 결합 시 당뇨 조기 식별', value: '+21.5', unit: '%', desc: 'Diabetes 저널 | 13,294명 추적 연구' },
]

const services = [
  { no: '01', title: 'DNA 검사 신청', desc: '타액 키트로 집에서 간편하게 신청하세요.', to: '/dna-apply' },
  { no: '02', title: '건강검진 연동', desc: '건강보험공단 10년 검진 기록을 한 번에 불러와요.', to: '/health-history' },
  { no: '03', title: '결과 리포트', desc: 'DNA와 검진을 종합한 위험도를 확인하세요.', to: '/report' },
  { no: '04', title: '체질 테스트', desc: '술·담배·살 체질을 유전형으로 알아봐요.', to: '/event' },
]

const partners = [
  {
    no: '01',
    icon: 'lab',
    category: '공인 유전체 검증기관',
    name: '제노플랜코리아',
    quote:
      '“공인 연구기관에 연구를 직접 의뢰하여 12,480개 유전자 마커를 객관적으로 판독하고 정밀 프로파일링을 확립합니다.”',
  },
  {
    no: '02',
    icon: 'team',
    category: '정밀 포트폴리오 엔진',
    name: '내진(GENE)설계단',
    quote:
      '“보험설계사, 의료자문부서, 전문경영자 등으로 구성됐습니다. 다학제 전문 분석단이 모여 과보장 없이 최적의 구조를 만듭니다.”',
  },
  {
    no: '03',
    icon: 'building',
    category: '국내 생·손보사 통합망',
    name: '50개 제휴 보험사',
    quote:
      '“보험 상품 정보들을 한눈에 비교 분석합니다. 국내 주요 생·손보사 보장 상품들을 매칭하여 내 유전 취약점 대비 최대 혜택을 선별합니다.”',
  },
] as const

const steps = [
  {
    no: '01',
    title: '유전체 정밀 스캔',
    desc: '간편 타액 키트로 당뇨·심장질환·뇌혈관질환·유방암·대장암·치매의 유전적 위험도를 정밀 분석합니다.',
  },
  {
    no: '02',
    title: '종합 건강 리포트',
    desc: '건강검진 결과와 유전자 검사 결과를 한데 모아, 지금의 건강 상태와 앞으로의 잠재 위험을 한눈에 보여주는 종합 리포트를 제공합니다.',
  },
  {
    no: '03',
    title: '맞춤 보험 설계',
    desc: '건강검진만으로는 보이지 않던 유전적 잠재 위험까지 보강해, 나에게 꼭 맞는 보험을 설계하고 추천합니다.',
  },
] as const

type IconName = 'arrow'

const iconPaths: Record<IconName, string> = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
}

type PartnerIconName = 'lab' | 'team' | 'building'

/** 협력 구조 카드 아이콘: 선 여러 개로 그린 그림 */
const partnerIconPaths: Record<PartnerIconName, string[]> = {
  // 공인 검증기관: 플라스크 안에 이중나선
  lab: [
    'M9 3h6M10 3v5.5L4.8 17.6A2.3 2.3 0 0 0 6.8 21h10.4a2.3 2.3 0 0 0 2-3.4L14 8.5V3',
    'M7.6 12.6h8.8',
    'M8 16.6c1.3-2.2 2.7-2.2 4 0s2.7 2.2 4 0M8 16.6c1.3 2.2 2.7 2.2 4 0s2.7-2.2 4 0',
    'M10 15.6v2M14 15.6v2',
  ],
  // 설계단: 가운데 사람과 양옆 동료
  team: [
    'M12 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z',
    'M6 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6',
    'M5.6 10.6a2.4 2.4 0 1 1 1.2-4.5M18.4 10.6a2.4 2.4 0 1 0-1.2-4.5',
    'M2.5 18.4c0-2 1.3-3.6 3.2-4.2M21.5 18.4c0-2-1.3-3.6-3.2-4.2',
  ],
  // 제휴 보험사: 기둥이 있는 금융기관 건물
  building: ['M3.5 21h17', 'M4.5 9.2 12 4l7.5 5.2z', 'M6.5 12v6M10.2 12v6M13.8 12v6M17.5 12v6', 'M5 18.5h14'],
}

/** 청록 → 보라 그라데이션 선으로 그린 아이콘을 빛나는 유리 칸에 담음 */
function PartnerIcon({ name }: { name: PartnerIconName }) {
  const gid = `partner-grad-${useId().replace(/:/g, '')}`
  return (
    <span className={styles.partnerIcon}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5ef2e6" />
            <stop offset="1" stopColor="#b48cff" />
          </linearGradient>
        </defs>
        {partnerIconPaths[name].map((d) => (
          <path key={d} d={d} stroke={`url(#${gid})`} />
        ))}
      </svg>
    </span>
  )
}

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className ?? styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}

/** 스크롤 진행도(첫 화면 기준 0~1)를 --scroll 변수로 넘기고, 섹션이 보이면 나타나게 함 */
function useIntroMotion(pageRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const progress = Math.min(window.scrollY / window.innerHeight, 1)
        page.style.setProperty('--scroll', progress.toFixed(3))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const targets = page.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // 화면에 들어왔거나, 빠르게 지나쳐 이미 위로 올라간 요소도 보이게 함
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add(styles.revealed)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15 },
    )
    targets.forEach((el) => observer.observe(el))

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [pageRef])
}

// 움직임 줄이기 설정이면 진입 애니메이션을 생략
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const INTRO_SEEN_KEY = 'gene-intro-seen'

const introSeen = () => {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

const markIntroSeen = () => {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    // 저장이 막힌 환경이면 다음 진입 때 다시 재생될 뿐
  }
}

/* ---------- 2) 숫자 올라가기 ---------- */

/** "+47.7", "12,480" 같은 값을 화면에 들어올 때 0부터 올려 보여 줌 */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const prefix = value.match(/^[^\d]*/)?.[0] ?? ''
    const target = Number(value.replace(/[^\d.]/g, ''))
    const decimals = (value.split('.')[1] ?? '').length
    const format = (n: number) =>
      prefix + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      el.textContent = value
      return
    }
    el.textContent = format(0)

    let frame = 0
    const run = () => {
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min((now - start) / 1400, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        el.textContent = t < 1 ? format(target * eased) : value
        if (t < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run()
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value])
  return <span ref={ref}>{value}</span>
}

/* ---------- 3) 세계 지도 지구본 ---------- */

/** 연구소 위치: 경기도 성남시 분당구 판교 */
const HQ = { lat: 37.4, lng: 127.11 }

/**
 * 육지 점으로 그린 지구본. 한국 경도를 중심으로 좌우로 천천히 흔들리며 돌고,
 * 연구소(판교) 자리에 분홍 표시가 맥박처럼 퍼짐. 화면에 보일 때만 움직임
 */
function Globe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const RAD = Math.PI / 180
    const land = LAND_POINTS.map(([lat, lng]) => ({ phi: lat * RAD, lam: lng * RAD }))

    let width = 0
    let height = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // 위도·경도 → 화면 좌표 (중심 경도 lam0, 북쪽으로 tilt 만큼 기울여 한국이 잘 보이게)
    const tilt = 28 * RAD
    const project = (phi: number, lam: number, lam0: number, r: number, cx: number, cy: number) => {
      const x0 = Math.cos(phi) * Math.sin(lam - lam0)
      const y0 = Math.sin(phi)
      const z0 = Math.cos(phi) * Math.cos(lam - lam0)
      const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt)
      const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt)
      return { x: cx + x0 * r, y: cy - y * r, z }
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      const r = Math.min(width * 0.46, height * 0.42)
      const cx = width / 2
      const cy = height * 0.46
      const lam0 = (HQ.lng - 10 + Math.sin(t * 0.35) * 35) * RAD

      // 바다: 은은한 구
      const ocean = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r)
      ocean.addColorStop(0, 'rgba(94, 242, 230, 0.12)')
      ocean.addColorStop(1, 'rgba(19, 37, 74, 0.55)')
      ctx.fillStyle = ocean
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(94, 242, 230, 0.25)'
      ctx.lineWidth = 1
      ctx.stroke()

      // 육지 점: 앞쪽일수록 크고 진하게
      ctx.fillStyle = '#5ef2e6'
      for (const p of land) {
        const q = project(p.phi, p.lam, lam0, r, cx, cy)
        if (q.z <= 0) continue
        ctx.globalAlpha = 0.25 + q.z * 0.7
        ctx.beginPath()
        ctx.arc(q.x, q.y, 0.7 + q.z * 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // 연구소 표시
      const hq = project(HQ.lat * RAD, HQ.lng * RAD, lam0, r, cx, cy)
      if (hq.z > 0) {
        const pulse = (t * 0.9) % 1
        ctx.strokeStyle = `rgba(170, 102, 255, ${1 - pulse})`
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.arc(hq.x, hq.y, 6 + pulse * 22, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = '#aa66ff'
        ctx.shadowColor = 'rgba(170, 102, 255, 0.95)'
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.arc(hq.x, hq.y, 5.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        // 이름표: 오른쪽 끝에 닿으면 표시의 왼쪽에 붙임
        ctx.font = '700 13px Pretendard, sans-serif'
        const labelW = ctx.measureText('제노플랜코리아 연구소').width
        const toLeft = hq.x + 20 + labelW > width - 12
        const dir = toLeft ? -1 : 1
        const lx = hq.x + dir * 16
        const ly = hq.y - 26
        ctx.strokeStyle = 'rgba(170, 102, 255, 0.7)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(hq.x + dir * 4, hq.y - 4)
        ctx.lineTo(lx, ly + 6)
        ctx.stroke()
        ctx.textAlign = toLeft ? 'right' : 'left'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('제노플랜코리아 연구소', lx + dir * 4, ly)
        ctx.font = '500 11px Pretendard, sans-serif'
        ctx.fillStyle = 'rgba(228, 232, 239, 0.7)'
        ctx.fillText('PANGYO · KOREA', lx + dir * 4, ly + 15)
        ctx.textAlign = 'left'
      }
    }

    resize()
    draw(0)
    const reduced = prefersReducedMotion()
    let frame = 0
    let visible = false
    const start = performance.now()
    const tick = (now: number) => {
      draw((now - start) / 1000)
      if (visible) frame = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      cancelAnimationFrame(frame)
      if (visible && !reduced) frame = requestAnimationFrame(tick)
    })
    observer.observe(canvas)
    const onResize = () => {
      resize()
      draw((performance.now() - start) / 1000)
    }
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return <canvas ref={ref} className={className} aria-label="판교에 있는 제노플랜코리아 연구소를 표시한 지구본" role="img" />
}

/* ---------- 숫자 카드 회전 ---------- */

/** 칸을 시계방향(큰 칸 → 아래 오른쪽 → 아래 가운데 → 아래 왼쪽)으로 셌을 때, 처음 각 칸에 있는 숫자 번호 */
const STAT_ORDER = [0, 3, 2, 1]
/** turn 번 돌았을 때 k 번째 칸(시계방향 순서)에 올 숫자의 STAT_ORDER 위치 */
const slotOf = (k: number, turn: number) => (((k - turn) % 4) + 4) % 4

/** 숫자 카드 한 칸의 내용. turn 이 바뀔 때마다 새로 그려져 조용히 서서히 바뀜 (숫자 올라가기 없음) */
function StatBody({ s, turn, leaving }: { s: (typeof stats)[number]; turn: number; leaving: boolean }) {
  return (
    <div key={`${s.label}-${turn}`} className={`${styles.statSwap} ${leaving ? styles.statLeaving : ''}`}>
      <span className={styles.statLabel}>{s.label}</span>
      <strong className={styles.statValue}>
        {turn === 0 ? <CountUp value={s.value} /> : s.value}
        <small>{s.unit}</small>
      </strong>
      <span className={styles.statDesc}>{s.desc}</span>
    </div>
  )
}

/** 화면에 보이는 동안 10초마다 1씩 늘어나는 회전 횟수. 마우스를 올리면 잠깐 멈춤 */
function useStatTurn(ref: RefObject<HTMLElement | null>) {
  const [turn, setTurn] = useState(0)
  // 바뀌기 직전 1.2초 동안 기존 숫자를 천천히 흐리게 함
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    let visible = false
    let hover = false
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    }, { threshold: 0.3 })
    observer.observe(el)
    const enter = () => (hover = true)
    const leave = () => (hover = false)
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    let swap = 0
    const timer = window.setInterval(() => {
      if (!visible || hover) return
      setLeaving(true)
      swap = window.setTimeout(() => {
        setTurn((t) => t + 1)
        setLeaving(false)
      }, 1200)
    }, 10000)
    return () => {
      observer.disconnect()
      window.clearInterval(timer)
      window.clearTimeout(swap)
      el.removeEventListener('mouseenter', enter)
      el.removeEventListener('mouseleave', leave)
    }
  }, [ref])
  return { turn, leaving }
}

function Intro() {
  const pageRef = useRef<HTMLDivElement>(null)
  useIntroMotion(pageRef)
  const helixRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const { turn: statTurn, leaving: statLeaving } = useStatTurn(statsRef)

  // 방문(브라우저 탭 세션)당 한 번만 재생
  // 주소 끝에 ?intro 를 붙이면 설정과 상관없이 항상 다시 재생 (테스트·시연용)
  const [treePlayed] = useState(
    () =>
      new URLSearchParams(window.location.search).has('intro') ||
      (!prefersReducedMotion() && !introSeen()),
  )
  const [treeDone, setTreeDone] = useState(() => !treePlayed)
  const handleTreeDone = useCallback(() => {
    markIntroSeen()
    setTreeDone(true)
  }, [])

  return (
    <div ref={pageRef} className={styles.page}>
      {!treeDone && <IntroTree onDone={handleTreeDone} />}
      {/* 배경: 별빛, 오로라, 페이지 전체에 걸친 유전자 나선 */}
      <div className={styles.cosmos} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.stars} />
      </div>
      <div ref={helixRef} className={styles.helixStage} role="img" aria-label="회전하는 3D 유전자 나선">
        <span className={styles.helixGlow} />
        {/* 한 화면 내릴 때마다 나선이 반 바퀴 더 돌아 본문과 함께 움직임 */}
        <DnaHelix background="transparent" scrollSpin={Math.PI} />
      </div>

      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <GeneLogo className={styles.brandMark} />
        </Link>

        <nav className={styles.nav}>
          <Link to="/" className={styles.navActive}>인트로</Link>
          <Link to="/main">서비스 메인</Link>
          <a href="#partners">회사소개</a>
          <Link to="/login">로그인/회원가입</Link>
        </nav>

      </header>

      <main className={styles.main}>
        {/* 히어로: 핵심 메시지 한 장 + 바로 설계 시작 버튼 */}
        <section className={styles.hero}>
          <div className={styles.heroSticky}>
            <div className={styles.heroSlides}>
              <div className={`${styles.heroCopy} ${styles.slideOn} ${treePlayed && treeDone ? styles.heroEnter : ''}`}>
                <h1 className={styles.heroTitle}>
                  보험에 나를 맞추지 마세요.
                  <br />
                  <span className={styles.gradientText}>보험을 나에게 맞추세요.</span>
                </h1>
                <p className={styles.heroDesc}>
                  <span>
                    <b>내진(GENE)설계</b>는 유전적 위험도에 꼭 맞는 필수 보장만 정밀하게 담아냅니다.
                  </span>
                  <span>중복되거나 불필요한 특약에 새어나가던 보험료를 투명하게 바로잡습니다.</span>
                </p>
                <div className={styles.heroCtas}>
                  <Link to="/login" className={styles.primaryBtn}>
                    내 보험 설계 GENE행하기 <Icon name="arrow" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 왼쪽 세로 나선이 내려오다 휘어져 가로 이중나선으로 이어짐 */}
        <DnaFlow helixRef={helixRef} pageRef={pageRef} />

        <section id="numbers" className={`${styles.section} ${styles.bandGray}`}>
          <p className={styles.kicker} data-reveal>
            BY THE NUMBERS
          </p>
          <h2 className={styles.sectionTitle} data-reveal>
            숫자로 증명하는 정밀함
            <span className={styles.sectionSub}>연구 결과와 분석 실적</span>
          </h2>
          <div className={styles.numbers}>
            {/* 왼쪽: 지구본과 연구소 위치 */}
            <div className={`${styles.glass} ${styles.globeCard}`} data-reveal>
              <Globe className={styles.globe} />
              <div className={styles.globeInfo}>
                <span className={styles.globeTag}>RESEARCH LAB</span>
                <strong>제노플랜코리아 연구소</strong>
                <span>경기도 성남시 분당구 판교로228번길 15 판교세븐벤처밸리1단지 제3동 8층</span>
              </div>
            </div>

            {/* 오른쪽: 대표 숫자 크게 + 작은 숫자 세 칸. 칸 모양은 그대로, 10초마다 숫자가 시계방향으로 한 칸씩 이동 */}
            <div ref={statsRef} className={styles.numbersRight}>
              <div className={`${styles.glass} ${styles.stat} ${styles.statBig}`} data-reveal>
                <StatBody s={stats[STAT_ORDER[slotOf(0, statTurn)]]} turn={statTurn} leaving={statLeaving} />
              </div>
              <ul className={styles.statRow}>
                {[0, 1, 2].map((j) => (
                  <li
                    key={j}
                    className={`${styles.glass} ${styles.stat}`}
                    style={{ '--delay': `${(j + 1) * 80}ms` } as CSSProperties}
                    data-reveal
                  >
                    <StatBody s={stats[STAT_ORDER[slotOf(3 - j, statTurn)]]} turn={statTurn} leaving={statLeaving} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>


        <section id="partners" className={`${styles.section} ${styles.bandWhite}`}>
          <p className={styles.kicker} data-reveal>
            PARTNERS
          </p>
          <h2 className={styles.sectionTitle} data-reveal>
            3대 핵심 협력 구조
            <span className={styles.sectionSub}>데이터 객관성과 설계 신뢰도</span>
          </h2>

          <div className={styles.partners}>
            {partners.map((p, i) => (
              <article
                key={p.no}
                className={`${styles.glass} ${styles.partner}`}
                style={{ '--delay': `${i * 120}ms` } as CSSProperties}
                data-reveal
              >
                <PartnerIcon name={p.icon} />
                <p className={styles.partnerCategory}>{p.category}</p>
                <h3 className={styles.partnerName}>{p.name}</h3>
                <p className={styles.partnerQuote}>{p.quote}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className={`${styles.section} ${styles.bandGray}`}>
          <p className={styles.kicker} data-reveal>
            PROCESS
          </p>
          <h2 className={styles.sectionTitle} data-reveal>
            내진설계 3단계 간이 프로세스
          </h2>

          {/* 단계 사이를 염기쌍처럼 잇는 빛줄기 */}
          <ol className={styles.steps}>
            {steps.map((s, i) => (
              <li
                key={s.no}
                className={`${styles.glass} ${styles.step}`}
                style={{ '--delay': `${i * 140}ms` } as CSSProperties}
                data-reveal
              >
                <span className={styles.stepNode} aria-hidden="true" />
                <span className={styles.stepNo}>STEP {s.no}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- 서비스 바로가기 ---------- */}
        <section className={`${styles.section} ${styles.bandWhite}`}>
          <p className={styles.kicker} data-reveal>
            SERVICES
          </p>
          <h2 className={styles.sectionTitle} data-reveal>
            상담부터 리포트까지, 한곳에서
          </h2>
          <ul className={styles.services}>
            {services.map((sv, i) => (
              <li key={sv.no} style={{ '--delay': `${i * 100}ms` } as CSSProperties} data-reveal>
                <Link to={sv.to} className={`${styles.glass} ${styles.service}`}>
                  <span className={styles.serviceNo}>SERVICE {sv.no}</span>
                  <strong>{sv.title}</strong>
                  <span className={styles.serviceDesc}>{sv.desc}</span>
                  <span className={styles.servicePlus} aria-hidden="true">
                    +
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </main>

      <footer className={styles.footer}>
        <div>
          <p className={styles.footerBrand}>
            내진설계(GENE) Precision InsurTech <span>· 제노플랜코리아 연계 파트너십</span>
          </p>
          <p className={styles.footerCopy}>
            CONFIDENTIAL · © 2026 내진설계(GENE). 모든 유전체 정보는 생명윤리 및 안전에 관한
            법률 및 유전정보보호 가이드라인에 따라 암호화 관리됩니다.
          </p>
        </div>
        <div className={styles.footerRight}>
          <p>
            <a href="#">유전정보보호법 준수 방침</a>
            <a href="#">이용약관</a>
          </p>
          <p>
            고객지원센터 <b>1588-0921</b>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Intro
