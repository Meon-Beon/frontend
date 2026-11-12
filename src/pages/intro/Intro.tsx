import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import DnaHelix from '../../components/dna-helix/DnaHelix'
import GeneLogo from '../../components/GeneLogo/GeneLogo'
import styles from './style.module.css'

const stats = [
  { label: '질환 커버리지 적중', value: '96.2%', desc: '유전 취약군 정밀 타겟' },
  { label: '비교 연계 보험사', value: '50 사', desc: '생·손보 통합 데이터' },
  { label: '정밀 진단 소요시간', value: '3분', desc: '실시간 다차원 스캔' },
]

const partners = [
  {
    no: '01',
    icon: 'lab',
    category: '공인 유전체 검증기관',
    name: '한국유전자정보센터',
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
    name: '32개 제휴 보험사',
    quote:
      '“보험 상품 정보들을 한눈에 비교 분석합니다. 국내 주요 생·손보사 보장 상품들을 매칭하여 내 유전 취약점 대비 최대 혜택을 선별합니다.”',
  },
] as const

const steps = [
  {
    no: '01',
    title: '유전체 정밀 스캔',
    desc: '간편 타액 키트 또는 기존 결과지를 통해 주요 74종 암·심뇌혈관 만성질환 취약점과 가족력을 정밀 디지털 스캔합니다.',
  },
  {
    no: '02',
    title: '보유 보험 다이어트',
    desc: "현재 납입 중인 기가입 증권을 불러와 유전적 위험도가 '낮음'으로 판정된 불필요 과보장 및 중복 특약을 정밀 소멸합니다.",
  },
  {
    no: '03',
    title: '결핍 위험 1:1 집중 보강',
    desc: '유전적으로 발병 위험이 감지된 잠재 결핍 항목만 32개사 최적 상품에서 1:1 타겟 특약으로 가장 알뜰하게 채워 넣습니다.',
  },
] as const

type IconName =
  | 'arrow'
  | 'checkCircle'
  | 'db'
  | 'lab'
  | 'team'
  | 'building'
  | 'upload'

const iconPaths: Record<IconName, string> = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.2 12.3l2.6 2.6 5-5.6',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  lab: 'M6 21h12M9 21v-3a5 5 0 0 0 0-10M10 4l4 4-3 3-4-4zM14 18a6 6 0 0 0 4-6',
  team: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5 6-5s6 2 6 5M14 15.2c.6-.1 1.3-.2 2-.2 3.3 0 6 2 6 5',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4',
  upload: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 17v-6M9.5 13.5L12 11l2.5 2.5',
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

function Intro() {
  const pageRef = useRef<HTMLDivElement>(null)
  useIntroMotion(pageRef)

  return (
    <div ref={pageRef} className={styles.page}>
      {/* 배경: 별빛, 오로라, 페이지 전체에 걸친 유전자 나선 */}
      <div className={styles.cosmos} aria-hidden="true">
        <span className={styles.aurora} />
        <span className={styles.stars} />
      </div>
      <div className={styles.helixStage} role="img" aria-label="회전하는 3D 유전자 나선">
        <span className={styles.helixGlow} />
        {/* 한 화면 내릴 때마다 나선이 반 바퀴 더 돌아 본문과 함께 움직임 */}
        <DnaHelix background="transparent" scrollSpin={Math.PI} />
      </div>

      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <GeneLogo className={styles.brandMark} title="" />
          <span>
            <strong className={styles.brandName}>
              내진<em>(GENE)</em>설계
            </strong>
            <small className={styles.brandSub}>유전자 기반 정밀 보험 설계</small>
          </span>
        </Link>

        <nav className={styles.nav}>
          <Link to="/" className={styles.navActive}>인트로</Link>
          <Link to="/main">서비스 메인</Link>
          <a href="#partners">회사소개</a>
          <Link to="/login">로그인/회원가입</Link>
        </nav>

        <div className={styles.headerActions}>
          <Link to="/login" className={styles.headerCta}>
            내 보험 설계 GENE행하기 <Icon name="arrow" />
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          {/* 왼쪽 칸은 배경 나선이 보이도록 비워 둠 */}
          <div className={styles.heroCopy}>
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

            <ul className={styles.trust}>
              <li>
                <Icon name="checkCircle" /> 보건복지부 DTC 4.0 인증 완료
              </li>
              <li>
                <Icon name="checkCircle" /> 유전정보보호 가이드라인 100% 준수
              </li>
              <li>
                <Icon name="db" /> 누적 42,000건+ 유전체 분석 포트폴리오
              </li>
            </ul>
          </div>

          <a href="#numbers" className={styles.scrollCue} aria-label="아래로 이동">
            <span />
          </a>
        </section>

        <section id="numbers" className={`${styles.glass} ${styles.stats}`} data-reveal>
          {stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statLabel}>{s.label}</span>
              <strong className={styles.statValue}>{s.value}</strong>
              <span className={styles.statDesc}>{s.desc}</span>
            </div>
          ))}
        </section>

        <section id="partners" className={styles.section}>
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
                <div className={styles.partnerTop}>
                  <span className={styles.partnerIcon}>
                    <Icon name={p.icon} />
                  </span>
                  <span className={styles.partnerNo}>PARTNER {p.no}</span>
                </div>
                <p className={styles.partnerCategory}>{p.category}</p>
                <h3 className={styles.partnerName}>{p.name}</h3>
                <p className={styles.partnerQuote}>{p.quote}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className={styles.section}>
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
                <span className={styles.stepArrow}>
                  <Icon name="arrow" />
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 마지막 행동 유도: 설계 시작 / 결과지 등록 */}
        <div className={styles.ctaStack}>
          <section className={`${styles.glass} ${styles.cta}`} data-reveal>
            <h3 className={styles.ctaTitle}>내 유전자에 꼭 맞는 보험, 지금 설계해 보세요</h3>
            <Link to="/login" className={`${styles.primaryBtn} ${styles.ctaMainBtn}`}>
              내 보험 설계 GENE행하기
              <Icon name="arrow" />
            </Link>
          </section>

          <section
            className={`${styles.glass} ${styles.cta}`}
            style={{ '--delay': '120ms' } as CSSProperties}
            data-reveal
          >
            <h3 className={`${styles.ctaTitle} ${styles.ctaTitleSmall}`}>
              유전자 검사 결과지가 이미 있으신가요?
            </h3>
            <Link to="/dna-apply" className={styles.resultBtn}>
              <Icon name="upload" /> 결과지 등록하고 무료 진단 <Icon name="arrow" />
            </Link>
          </section>
        </div>

      </main>

      <footer className={styles.footer}>
        <div>
          <p className={styles.footerBrand}>
            내진설계(GENE) Precision InsurTech <span>· 한국유전자정보센터 연계 파트너십</span>
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
            고객지원센터 <b>1588-0000</b>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Intro
