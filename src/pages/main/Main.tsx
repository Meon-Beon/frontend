import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../../components/Footer/Footer'
import pcrIcon from '../../assets/icons/pcr-test.png'
import writingIcon from '../../assets/icons/writing.png'
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

/** 두 가닥이 꼬인 유전자 나선. 카드 글자색(currentColor)을 따름 */
function DnaIcon() {
  return (
    <svg
      className={styles.stepIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M7 2.5c0 4.75 10 4.75 10 9.5s-10 4.75-10 9.5M17 2.5c0 4.75-10 4.75-10 9.5s10 4.75 10 9.5" />
      <path d="M8.2 5.5h7.6M10 8.6h4M10 15.4h4M8.2 18.5h7.6" />
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
    icon: <DnaIcon />,
    title: 'DNA 검사 신청',
    desc: '한국유전자정보센터 전문 연구소 안전 접수',
    footer: '신청하기',
    to: '/dna-apply',
  },
  {
    icon: pngIcon(writingIcon),
    title: '건강검진이력, 가족력 입력',
    desc: '건보공단 10년 마이데이터와 직계 3대 가족력 간편 등록',
    footer: '마이데이터 연동',
    to: '/health-history',
  },
  {
    icon: pngIcon(pcrIcon),
    title: '유전자 검사 + 건강이력 결과 리포트',
    desc: 'PRS 유전 위험도와 생활검진 복합 분석 신호등 리포트 한눈에 확인',
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
          <h1 className={styles.title}>신뢰를 바탕으로 합니다</h1>
          <p className={styles.subtitle}>유전자 데이터로 완성하는 초개인화 보험</p>
          <p className={styles.desc}>
            비대면 타액(DNA) 검사 결과와 건보공단 마이데이터 검진 이력을 결합하여 불필요한 보장은
            덜어내고 꼭 필요한 질병 보장만 정밀 설계합니다.
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
