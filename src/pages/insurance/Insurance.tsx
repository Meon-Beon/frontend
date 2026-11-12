import { Link } from 'react-router-dom'
import styles from './style.module.css'

// TODO: 보험설계 화면이 정해지면 이 임시 안내를 실제 내용으로 교체
function Insurance() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.card}>
          <p className={styles.badge}>준비 중</p>
          <h1 className={styles.title}>
            내 유전자 맞춤 <em>보험설계</em>
          </h1>
          <p className={styles.desc}>
            유전자 분석 결과와 건강검진 이력을 바탕으로 약 50개 보험사의 보장을 비교해, 꼭 필요한
            보장만 담은 맞춤 포트폴리오를 설계하는 화면을 준비하고 있습니다.
          </p>
          <Link to="/main" className={styles.back}>
            메인으로 돌아가기
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Insurance
