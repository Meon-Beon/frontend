import { useState, type CSSProperties } from 'react'
import { DEMO_PERSON } from '../../api/healthDemo'
import { readUser } from '../../auth/session'
import design from './designData.json'
import './insurance_setting.css'

/*
 * GENE 보험설계 (피그마 프로토타입 구조)
 * 왼쪽(화면에 고정): 월 납입 보험료 합계 · 현재 유지 중인 보험 목록 · 보장 공백 및 위험 경고 리포트
 * 오른쪽(이 영역만 스크롤): 내 GENE에 적합한 보험 카드 목록
 *
 * TODO: 보험설계 API가 생기면 서버에서 받아오기. 지금은 포트폴리오 산출 결과(hu4BE6F2 · 시연 인물)를 넣어 둔 프로토타입 데이터
 */

type Coverage = { name: string; amount: string }
type Recommendation = (typeof design.recommendations)[number]

const won = (n: number) => n.toLocaleString('ko-KR')

/** 상품명 끝의 판매 코드(2601, 26.07 등)와 밑줄은 화면에서 뺌 */
const cleanName = (name: string) =>
  name
    .replace(/\([\d.]+\)/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** 태그용 짧은 보장 이름: 괄호 설명은 덜어 냄 (예: "갑상선암(중증 갑상선암 제외)" → "갑상선암") */
const shortName = (name: string) => name.replace(/\(.*?\)/g, '').trim()

/** "2000만원" → "2,000만원". 조건이 붙은 금액은 그대로 */
const prettyAmount = (amount: string) => {
  const m = amount.replace(/\s/g, '').match(/^(\d+)만원$/)
  return m ? `${won(Number(m[1]))}만원` : amount
}

/** 보유 보험 태그: "일반암진단 1,000만원"처럼 금액까지 */
const ownedTag = (c: Coverage) => {
  const amount = prettyAmount(c.amount)
  return amount.length <= 9 ? `${shortName(c.name)} ${amount}` : shortName(c.name)
}

/* ---------- 보장 공백 경고 문구 ---------- */

/** 유전·검진상 위험이 있는 질병만, 공백 의심은 한 줄로 묶고 나머지는 질병마다 한 줄 */
const WARNINGS = (() => {
  const atRisk = design.gaps.filter((g) => g.atRisk)
  const gaps = atRisk.filter((g) => g.status === '공백의심').map((g) => g.disease)
  const lines: { text: string; detail: string; tone: 'gap' | 'check' }[] = []
  if (gaps.length) {
    lines.push({
      text: `${gaps.join('·')} 질환 직접 보장 공백 의심`,
      detail: '현재 보험에서 해당 질환의 진단·수술·입원 보장 문구가 확인되지 않았어요.',
      tone: 'gap',
    })
  }
  for (const g of atRisk) {
    if (g.status === '보장확인') lines.push({ text: `${g.disease} 보장 범위 확인 필요`, detail: g.detail, tone: 'check' })
    if (g.status === '정보부족') lines.push({ text: `${g.disease} 진단 보장 여부 확인 필요`, detail: g.detail, tone: 'check' })
  }
  return lines
})()

/** 질병마다 고유 색: 추천 카드의 왼쪽 띠와 질병 칩에 씀 */
const DISEASE_COLOR: Record<string, string> = {
  심장: '#ff8aa0',
  뇌혈관: '#b48cff',
  당뇨: '#ffc857',
  고혈압: '#ff9f6b',
  치매: '#6fb8ff',
  대장암: '#5ee08a',
}
const colorOf = (d: string) => DISEASE_COLOR[d] ?? '#5ef2e6'

const TOTAL = design.existing.reduce((sum, p) => sum + p.premium, 0)

function Arrow() {
  return (
    <svg className="is-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/* ---------- 오른쪽 카드 ---------- */

function RecommendCard({ r, index, open, onToggle }: { r: Recommendation; index: number; open: boolean; onToggle: () => void }) {
  const id = `is-rec-${r.rank}`
  return (
    <li
      className={`is-rec${open ? ' is-open' : ''}`}
      style={{ animationDelay: `${index * 60}ms`, '--accent': colorOf(r.diseases[0]) } as CSSProperties}
    >
      <button type="button" className="is-rec-main" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className="is-rec-top">
          <span className="is-insurer">{r.insurer}</span>
          {/* 이 보험이 대비하는 질병 */}
          <span className="is-diseases">
            {r.diseases.map((d) => (
              <i key={d} style={{ '--c': colorOf(d) } as CSSProperties}>
                {d}
              </i>
            ))}
          </span>
        </span>
        <span className="is-name">{cleanName(r.name)}</span>
        <span className="is-tags">
          {r.coverages.slice(0, 3).map((c) => (
            <span key={c.name}>{shortName(c.name)}</span>
          ))}
        </span>
        <span className="is-rec-foot">
          <span className="is-price">
            <em>월</em> <strong>{won(r.premium)}</strong> 원
          </span>
          <Arrow />
        </span>
      </button>

      {/* 화살표를 누르면 추천 근거 · 보장 내용 · 확인할 점이 펼쳐짐 */}
      <div id={id} className="is-rec-detail" hidden={!open}>
        <h4>추천 이유</h4>
        <p>{r.reason}</p>

        <h4>보장 내용</h4>
        <dl className="is-coverages">
          {r.coverages.map((c) => (
            <div key={c.name}>
              <dt>{c.name}</dt>
              <dd>{prettyAmount(c.amount)}</dd>
            </div>
          ))}
        </dl>

        {r.checks.length > 0 && (
          <>
            <h4>가입 전 확인할 점</h4>
            <ul className="is-checks">
              {r.checks.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  )
}

/* ---------- 화면 ---------- */

function InsuranceSetting() {
  const name = readUser()?.name ?? DEMO_PERSON.name
  const [openRank, setOpenRank] = useState<number | null>(null)

  return (
    <div className="is-page">
      <div className="is-wrap">
        <div className="is-titlebar">
          <h1>GENE 보험설계</h1>
          {/* 서버 리포트(PDF)가 생기기 전까지는 이 화면을 인쇄·PDF 저장 */}
          <button type="button" className="is-download" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            리포트 다운로드
          </button>
        </div>

        <div className="is-layout">
          {/* ---------- 왼쪽: 화면 높이에 맞춰 고정 ---------- */}
          <section className="is-panel is-left">
            <h2>
              <u>{name}</u> 님의 현재 보유 보험
            </h2>

            <div className="is-left-body">
              <div className="is-total">
                <p>월 납입 보험료 합계</p>
                <div>
                  <strong>
                    {won(TOTAL)}
                    <small>
                      원 <em>/ 월</em>
                    </small>
                  </strong>
                  <span>
                    보유 보험 <b>{design.existing.length}건</b>
                  </span>
                </div>
              </div>

              <div className="is-list-head">
                <h3>현재 유지 중인 보험 목록 ({design.existing.length}건)</h3>
                <span>마이데이터 연동 기준</span>
              </div>
              <ul className="is-owned">
                {design.existing.map((p) => (
                  <li key={p.name}>
                    <div className="is-owned-head">
                      <span className="is-insurer">{p.insurer}</span>
                      <span className="is-owned-price">
                        <em>월</em> <b>{won(p.premium)}</b> 원
                      </span>
                    </div>
                    <p className="is-name">{cleanName(p.name)}</p>
                    <div className="is-tags">
                      {p.coverages.map((c) => (
                        <span key={c.name}>{ownedTag(c)}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              <section className="is-alert">
                <h3>보장 공백 및 위험 경고 리포트</h3>
                <ul>
                  {WARNINGS.map((w) => (
                    <li key={w.text} title={w.detail} className={`is-alert-${w.tone}`}>
                      {w.text}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>

          {/* ---------- 오른쪽: 이 영역만 스크롤 ---------- */}
          <section className="is-panel is-right">
            <h2>내 GENE에 적합한 보험이에요</h2>
            <div className="is-scroll">
              <ul className="is-recs">
                {design.recommendations.map((r, i) => (
                  <RecommendCard
                    key={r.rank}
                    r={r}
                    index={i}
                    open={openRank === r.rank}
                    onToggle={() => setOpenRank(openRank === r.rank ? null : r.rank)}
                  />
                ))}
              </ul>
              <p className="is-footnote">보험료는 보험사 공시 기준 예시 금액이며 본인 견적이 아니에요.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default InsuranceSetting
