import GeneLogo from '../GeneLogo/GeneLogo'
import styles from './style.module.css'

const POLICY_LINKS = ['개인정보처리방침', '이용약관', '유전자검사인권헌장', '보안센터']

/** 서비스 메인부터 쓰는 공통 푸터 */
function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.company}>
            <p className={styles.brand}>
              <GeneLogo className={styles.logo} />
            </p>
            <p className={styles.about}>
              내진(GENE)설계는 유전자 분석 검사 데이터와 개인 건강검진 기록을 복합
              분석하여 가장 최적화된 건강 포트폴리오 및 보험 설계를 제공하는 정밀 유전체
              인슈어테크 기업입니다.
            </p>
            <p className={styles.info}>
              <span>대표이사: 지민</span>
              <span>사업자등록번호: 220-88-01928</span>
              <span>보험대리점 등록번호: 제2024-0391호</span>
            </p>
            <p className={styles.info}>서울 성동구 왕십리로 63</p>
          </div>

          <div className={styles.support}>
            <p className={styles.supportTitle}>고객지원 및 분쟁처리</p>
            <a href="tel:1588-0921" className={styles.phone}>
              1588-0921
            </a>
            <p className={styles.supportText}>
              평일 09:00 - 18:00 (점심시간 12:00 - 13:00)
              <br />
              유전체 상담 전문 간호사 상시 배속
              <br />
              이메일: <a href="mailto:qlghsdosqlghs@gmail.com">qlghsdosqlghs@gmail.com</a>
            </p>
          </div>
        </div>

        <div className={styles.bottom}>
          <nav className={styles.links} aria-label="약관 및 정책">
            {/* TODO: 약관 페이지가 생기면 경로 연결 */}
            {POLICY_LINKS.map((label) => (
              <a key={label} href="#">
                {label}
              </a>
            ))}
          </nav>
          <p className={styles.copy}>
            © 2026 GENEDESIGN Inc. All rights reserved. Precision Genomic Insurtech.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
