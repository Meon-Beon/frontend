import { useCallback, useState } from 'react'
import { readUser } from '../../auth/session'
import Footer from '../../components/Footer/Footer'
import HealthCheckPopup from '../health_check_popup/health_check_popup'
import type { HealthCheckLookup } from '../health_check_popup/health_check_popup'
import { formatDate, maskName } from '../health_check_popup/format'
import styles from './style.module.css'

function Icon({ d, className = styles.icon }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
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

const ICON = {
  download: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  shield: 'M12 2.8c2.4 1.5 5 2.2 7.6 2.2v6.3c0 5-3.3 8.6-7.6 10-4.3-1.4-7.6-5-7.6-10V5c2.6 0 5.2-.7 7.6-2.2z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  calendar: 'M4 6.5h16V20H4zM4 10h16M8 3.5v4M16 3.5v4',
  doc: 'M7 3.5h7l4 4V20.5H7zM14 3.5v4h4M10 12h5M10 15.5h5',
}

function HealthHistory() {
  // 팝업을 새로 조회로 열지, 이미 받은 결과로 열지
  const [popup, setPopup] = useState<'closed' | 'lookup' | 'result'>('closed')
  const [lookup, setLookup] = useState<HealthCheckLookup | null>(null)
  const user = readUser()

  const closePopup = useCallback(() => setPopup('closed'), [])

  const latest = lookup?.checkups[0]
  const oldest = lookup?.checkups[lookup.checkups.length - 1]

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.title}>건강검진 이력</h1>
            <p className={styles.subtitle}>건강보험공단 마이데이터로 10년 검진 기록을 한 번에</p>
            <p className={styles.desc}>
              국가건강검진 결과를 불러와 유전자 검사 결과와 함께 분석해요.
              <br />
              직접 입력할 필요 없이 본인 확인만 하면 끝나요.
            </p>
          </div>

          <button type="button" className={styles.cta} onClick={() => setPopup('lookup')}>
            <Icon d={lookup ? ICON.refresh : ICON.download} />
            {lookup ? '건강검진 내역 다시 불러오기' : '건강검진 내역 끌어오기'}
          </button>
        </section>

        {lookup && latest && oldest ? (
          // 결과는 팝업에서 보고, 여기에는 불러온 내역 요약만 남김
          <section className={styles.summary}>
            <div className={styles.person}>
              <span className={styles.avatar} aria-hidden="true">
                {lookup.identity.name[0]}
              </span>
              <div>
                <p className={styles.personName}>
                  {maskName(lookup.identity.name)} <small>님</small>
                </p>
                <p className={styles.personMeta}>
                  {formatDate(lookup.identity.birth)} · {lookup.identity.gender === 'M' ? '남' : '여'}
                </p>
              </div>
            </div>
            <dl className={styles.stats}>
              <div>
                <dt>조회 기간</dt>
                <dd>
                  {oldest.date.slice(0, 4)} ~ {latest.date.slice(0, 4)}
                </dd>
              </div>
              <div>
                <dt>검진 횟수</dt>
                <dd>{lookup.checkups.length}회</dd>
              </div>
              <div>
                <dt>최근 종합판정</dt>
                <dd className={`${styles.levelText} ${styles[latest.overall.level]}`}>{latest.overall.label}</dd>
              </div>
            </dl>
            <button type="button" className={styles.viewBtn} onClick={() => setPopup('result')}>
              <Icon d={ICON.doc} />
              결과 보기
            </button>
          </section>
        ) : (
          <section className={styles.empty}>
            <h2>아직 불러온 건강검진 내역이 없어요</h2>
            <p>위의 &lsquo;건강검진 내역 끌어오기&rsquo;를 누르고 본인 확인을 하면 바로 조회돼요.</p>
            <ul className={styles.chips}>
              <li>
                <Icon d={ICON.calendar} /> 최근 10년 국가건강검진
              </li>
              <li>
                <Icon d={ICON.clock} /> 약 1분 소요
              </li>
              <li>
                <Icon d={ICON.shield} /> 주민번호 미저장
              </li>
            </ul>
          </section>
        )}
      </main>

      <Footer />

      <HealthCheckPopup
        open={popup !== 'closed'}
        onClose={closePopup}
        onResult={setLookup}
        initialLookup={popup === 'result' ? lookup : null}
        defaultName={user?.name ?? ''}
      />
    </div>
  )
}

export default HealthHistory
