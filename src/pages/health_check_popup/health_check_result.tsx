import { useState } from 'react'
import type { HealthCheckup, Level } from '../../api/health'
import { formatDate, maskName } from './format'
import type { HealthCheckIdentity } from './health_check_popup'
import './health_check_result.css'

const LEVEL_LABEL: Record<Level, string> = { good: '정상', warn: '주의', risk: '위험' }

/** 연도별 추이 표에 보여 줄 항목. 검진 결과 행의 key와 맞춤 */
const TREND_ITEMS = [
  { key: 'bmi', label: '체질량지수', unit: 'kg/m²' },
  { key: 'bp', label: '혈압', unit: 'mmHg' },
  { key: 'glucose', label: '공복혈당', unit: 'mg/dL' },
  { key: 'cholesterol', label: '총콜레스테롤', unit: 'mg/dL' },
  { key: 'creatinine', label: '혈청 크레아티닌', unit: 'mg/dL' },
  { key: 'egfr', label: '신사구체여과율', unit: 'mL/min' },
  { key: 'alt', label: 'ALT', unit: 'IU/L' },
  { key: 'ggt', label: 'γ-GTP', unit: 'IU/L' },
]

/** 검진 결과에서 key가 같은 행을 찾음 (연도별 추이용) */
function findRow(checkup: HealthCheckup, key: string) {
  for (const section of checkup.sections) {
    const row = section.rows.find((r) => r.key === key)
    if (row) return row
  }
  return undefined
}

const tone = (level: Level) => `health-check-result__tone--${level}`

type Props = {
  identity: HealthCheckIdentity
  checkups: HealthCheckup[]
}

/** 팝업 안에서 보여 주는 건강검진 결과. 흰 종이에 남색 글씨로 공문서처럼 */
function HealthCheckResult({ identity, checkups }: Props) {
  const [selected, setSelected] = useState(0)
  const latest = checkups[0]
  const oldest = checkups[checkups.length - 1]
  const current = checkups[selected]
  // 추이 표는 왼쪽이 오래된 회차가 되도록
  const timeline = [...checkups].reverse()

  return (
    <article className="health-check-result">
      {/* ---------- 머리말 ---------- */}
      <header className="health-check-result__head">
        <p className="health-check-result__kicker">국민건강보험공단 마이데이터 조회 결과</p>
        <h2 id="health-check-popup-title" className="health-check-result__title">
          건강검진 결과
        </h2>
        <dl className="health-check-result__person">
          <div>
            <dt>성명</dt>
            <dd>{maskName(identity.name)}</dd>
          </div>
          <div>
            <dt>생년월일 · 성별</dt>
            <dd>
              {formatDate(identity.birth)} · {identity.gender === 'M' ? '남' : '여'}
            </dd>
          </div>
          <div>
            <dt>조회 기간</dt>
            <dd>
              {oldest.date.slice(0, 4)} ~ {latest.date.slice(0, 4)} ({checkups.length}회)
            </dd>
          </div>
          <div>
            <dt>최근 종합판정</dt>
            <dd className={tone(latest.overall.level)}>{latest.overall.label}</dd>
          </div>
        </dl>
      </header>

      {/* ---------- 회차 선택 ---------- */}
      {checkups.length > 1 && (
        <div className="health-check-result__tabs" role="tablist" aria-label="검진 회차">
          {checkups.map((c, i) => (
            <button
              key={c.date}
              type="button"
              role="tab"
              aria-selected={i === selected}
              className="health-check-result__tab"
              onClick={() => setSelected(i)}
            >
              <b>{formatDate(c.date)}</b>
              <span>{c.hospital}</span>
            </button>
          ))}
        </div>
      )}

      {/* ---------- 주요 소견 ---------- */}
      <section className="health-check-result__section">
        <header className="health-check-result__section-head">
          <h3>주요 소견</h3>
          <p>
            {formatDate(current.date)} · {current.hospital} ·{' '}
            <b className={tone(current.overall.level)}>{current.overall.label}</b>
          </p>
        </header>
        <ul className="health-check-result__findings">
          {current.findings.map((f) => (
            <li key={f.title} className="health-check-result__finding">
              <span className="health-check-result__finding-top">
                <span className="health-check-result__finding-title">{f.title}</span>
                <b className={tone(f.level)}>{f.status}</b>
              </span>
              <strong className="health-check-result__finding-value">{f.value}</strong>
              <p className="health-check-result__finding-advice">{f.advice}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- 검사 항목별 결과 ---------- */}
      {current.sections.map((section) => (
        <section key={`${current.date}-${section.title}`} className="health-check-result__section">
          <header className="health-check-result__section-head">
            <h3>{section.title}</h3>
            <p>{section.rows.length}개 항목</p>
          </header>
          <div className="health-check-result__table-wrap">
            <table className="health-check-result__table">
              <thead>
                <tr>
                  <th scope="col">목표질환</th>
                  <th scope="col">검사항목</th>
                  <th scope="col">결과</th>
                  <th scope="col">참고치</th>
                  <th scope="col">판정</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((r) => (
                  <tr key={r.item}>
                    <td className="health-check-result__muted">{r.target ?? '-'}</td>
                    <th scope="row">{r.item}</th>
                    <td>
                      <span className="health-check-result__value">{r.result}</span>
                      {r.unit && <small className="health-check-result__unit">{r.unit}</small>}
                    </td>
                    <td className="health-check-result__muted">{r.reference || '-'}</td>
                    <td>
                      {r.judgment ? (
                        <b className={tone(r.level)}>{r.judgment}</b>
                      ) : (
                        <span className="health-check-result__muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* ---------- 문진 ---------- */}
      {current.interview && (
        <section className="health-check-result__section">
          <header className="health-check-result__section-head">
            <h3>진찰 (문진)</h3>
            <p>* 담당의사와 상담하세요.</p>
          </header>
          <dl className="health-check-result__interview">
            <div>
              <dt>과거병력</dt>
              <dd>{current.interview.history.join(', ')}</dd>
            </div>
            <div>
              <dt>약물치료</dt>
              <dd>{current.interview.medication}</dd>
            </div>
            <div>
              <dt>생활습관</dt>
              <dd className={tone('warn')}>{current.interview.lifestyle.join(', ')}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* ---------- 연도별 추이 ---------- */}
      {checkups.length > 1 && (
        <section className="health-check-result__section">
          <header className="health-check-result__section-head">
            <h3>연도별 주요 수치 추이</h3>
            <p>국가건강검진 {checkups.length}회</p>
          </header>
          <div className="health-check-result__table-wrap">
            <table className="health-check-result__table">
              <thead>
                <tr>
                  <th scope="col">검사항목</th>
                  {timeline.map((c) => (
                    <th key={c.date} scope="col">
                      {formatDate(c.date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TREND_ITEMS.map((t) => (
                  <tr key={t.key}>
                    <th scope="row">
                      {t.label} <small className="health-check-result__unit">{t.unit}</small>
                    </th>
                    {timeline.map((c) => {
                      const row = findRow(c, t.key)
                      return (
                        <td key={c.date} className={row ? undefined : 'health-check-result__muted'}>
                          {row ? row.result : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="health-check-result__legend">
        <span className={tone('good')}>{LEVEL_LABEL.good}</span>
        <span className={tone('warn')}>{LEVEL_LABEL.warn}</span>
        <span className={tone('risk')}>{LEVEL_LABEL.risk}</span>
        혈액검사 결과는 검진기관별로 검사방법 등에 따라 기준 수치가 다를 수 있어요.
      </p>
    </article>
  )
}

export default HealthCheckResult
