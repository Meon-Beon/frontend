import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import pcrIcon from '../../assets/icons/pcr-test.png'
import styles from './style.module.css'

const ARROW = 'M5 12h14M13 6l6 6-6 6'

function Icon({ d }: { d: string }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

/** 청진기. 카드 글자색(currentColor)을 따름 */
function StethoscopeIcon() {
  return (
    <svg
      className={styles.stepIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 2.8h2M13 2.8h2M6 2.8v5.4a4 4 0 0 0 8 0V2.8" />
      <path d="M10 12.2v2.6a5 5 0 0 0 10 0v-1.6" />
      <circle cx="20" cy="11" r="2.2" />
    </svg>
  )
}

/** 하트가 들어간 리포트 클립보드. 카드 글자색(currentColor)을 따름 */
function ReportIcon() {
  return (
    <svg
      className={styles.stepIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.5 4.2H6.6A1.6 1.6 0 0 0 5 5.8v14.6A1.6 1.6 0 0 0 6.6 22h10.8a1.6 1.6 0 0 0 1.6-1.6V5.8a1.6 1.6 0 0 0-1.6-1.6h-1.9" />
      <rect x="8.5" y="2.4" width="7" height="3.6" rx="1" />
      <path d="M12 14.2l-2.4-2.3a1.5 1.5 0 0 1 2.4-1.8 1.5 1.5 0 0 1 2.4 1.8z" />
      <path d="M9 17.4h6M9 19.6h3.6" />
    </svg>
  )
}

/** 체크가 들어간 방패. 카드 글자색(currentColor)을 따름 */
function ShieldIcon() {
  return (
    <svg
      className={styles.stepIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.8c2.4 1.5 5 2.2 7.6 2.2v6.3c0 5-3.3 8.6-7.6 10-4.3-1.4-7.6-5-7.6-10V5c2.6 0 5.2-.7 7.6-2.2z" />
      <path d="M8.6 12.1l2.4 2.4 4.6-4.8" />
    </svg>
  )
}

/** PNG 모양만 따서(마스크) 카드 색으로 칠함 */
const pngIcon = (src: string) => (
  <span
    className={`${styles.stepIcon} ${styles.maskIcon}`}
    style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }}
    aria-hidden="true"
  />
)

const STEPS: {
  icon: ReactNode
  title: string
  desc: string
  footer: string
  to: string
  final?: boolean
}[] = [
  {
    icon: pngIcon(pcrIcon),
    title: 'DNA 검사 신청',
    desc: '한국유전자정보센터 전문 연구소 안전 접수',
    footer: '신청하기',
    to: '/dna-apply',
  },
  {
    icon: <StethoscopeIcon />,
    title: '건강검진기록 입력',
    desc: '건보공단 10년 마이데이터 건강검진 이력 간편 등록',
    footer: '마이데이터 연동',
    to: '/health-history',
  },
  {
    icon: <ReportIcon />,
    title: '건강 종합 리포트',
    desc: '내 유전자 검사와 건강검진 내역을 모두 반영한 복합 분석 리포트 확인',
    footer: '리포트 확인하기',
    to: '/report',
  },
  {
    icon: <ShieldIcon />,
    title: 'GENE 보험설계',
    desc: '불필요한 과다 보장은 배제하고 내 유전체 맞춤 보장만 약 50개사 비교 설계',
    footer: 'GENE 맞춤 포트폴리오',
    to: '/insurance',
    final: true,
  },
]

function Main() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>신뢰를 바탕으로</h1>
          <p className={styles.subtitle}>유전자 데이터로 완성하는 초개인화 보험</p>
          <p className={styles.desc}>
            비대면 타액(DNA) 검사와 건보공단 마이데이터 검진 이력을 결합해
            <br />
            불필요한 보장은 덜고, 꼭 필요한 질병 보장만 정밀 설계합니다.
          </p>
        </section>

        <ul className={styles.steps}>
          {STEPS.map((s, i) => (
            <li
              key={s.to}
              className={s.final ? `${styles.card} ${styles.final}` : styles.card}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <Link to={s.to} className={styles.cardLink}>
                <span className={styles.iconBox}>
                  {s.icon}
                </span>
                <h2 className={styles.cardTitle}>{s.title}</h2>
                <p className={styles.cardDesc}>{s.desc}</p>
                <span className={styles.cardFooter}>
                  {s.footer}
                  <Icon d={ARROW} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <Footer />
    </div>
  )
}

export default Main
