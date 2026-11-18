import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import labPhoto from './lab-photo.jpg'
import researcher1 from './researcher-1.jpg'
import researcher2 from './researcher-2.jpg'
import researcher3 from './researcher-3.jpg'
import './laboratory.css'

/** 순차 등장 지연(ms)을 CSS 변수로 넘김 */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

/** lab-reveal 요소가 화면에 들어오면 lab-in을 붙여 차례로 떠오르게 함 */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // 화면에 들어왔거나, 빠르게 지나쳐 이미 위로 올라간 요소도 보이게 함
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add('lab-in')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12 },
    )
    root.querySelectorAll('.lab-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}

const ICONS = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chevron: 'M9 6l6 6-6 6',
}

function Icon({ d, className = 'lab-icon' }: { d: string; className?: string }) {
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

/** 원 없이 민트 체크만 (인증 목록 앞 표시) */
function CheckBadge() {
  return (
    <svg className="lab-check" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 10.6l3.6 3.6 7.4-8.2" />
    </svg>
  )
}

const FACILITY = [
  { label: 'LOCATION', value: ['경기도 성남시 분당구', '판교로228번길 15'], desc: '판교세븐벤처밸리 1단지 제3동 8층' },
  { label: 'CLEAN SYSTEM', value: 'HEPA H14 필터', desc: '교차오염 제로화 격벽 음압실' },
  { label: 'DATA ENCRYPTION', value: 'AES-256 GCM', desc: '원외 반출 불가 인트라넷 보관' },
  { label: 'POWER', value: '이중화 비상 전력망', desc: 'UPS · 발전기 연동 24시간 무중단 가동' },
]

const LOGISTICS = [
  ['입고 시간', '채취 후 24시간 내 중앙 연구소 입고'],
  ['배송 범위', '전국 병의원 및 다이렉트 키트 신청 고객'],
  ['위치 추적', '바코드 기반 검체 위치 실시간 확인'],
  ['분석기관', '보건복지부 DTC 유전자검사기관 승인'],
]

const PROCESS = [
  { title: '검수', desc: ['검체 수령 및', '바코드 라벨링'] },
  { title: '품질 검증', desc: ['DNA 추출 및', '품질 검증'] },
  { title: '핵심 시퀀싱', desc: ['초고속', '유전체 시퀀싱'] },
  { title: '변이 분석', desc: ['SNP', '질병 변이 판독'] },
  { title: '결과 발급', desc: ['검체 수거 후 72시간 내', '암호화 리포트 발급'] },
]

const EQUIPMENT = [
  ['NovaSeq X Plus', 'Illumina (USA)', '연간 최대 20,000명 전장유전체(WGS) 처리, 초고속 유전체 분석'],
  ['NextSeq 2000', 'Illumina (USA)', '표적 유전자 패널(Target Panel) 및 엑솜 시퀀싱 48시간 쾌속 가동'],
  ['Agilent 4200 TapeStation', 'Agilent Tech.', '자동화 전기영동 기반 DNA/RNA 무결성(DIN) 및 농도 전수 조사'],
  ['Biomek i7 Automated Liquid', 'Beckman Coulter', '로보틱 피펫팅 시스템으로 검체 혼입 및 휴먼 에러 원천 방지'],
  ['HPC Genomics Cluster', 'Dell EMC · 2.4 PFLOPS', 'Bioinformatics 대규모 유전변이 판독 및 기계학습 모델 탑재'],
]

const CERTS = [
  '보건복지부 질병관리청 DTC 유전자검사 인증',
  'KOLAS 국제공인시험기관 인정',
  'ISO/IEC 27001 정보보호 국제인증',
  '보건복지부 지정 기관생명윤리위원회(IRB) 운영',
  'CAP 국제 숙련도 평가 프로그램 정기 참여',
]

/** 연구진 및 의료 협력 네트워크: 역할 배치 예시 (실제 인물의 자격·소속·제휴를 확인한 내용 아님) */
const RESEARCHERS = [
  {
    org: '제노플랜코리아',
    name: '이도연 박사',
    role: '유전자 분석 연구진',
    photo: researcher1,
    summary: '유전자 검사 및 분석 결과 제공',
  },
  {
    org: '내진설계 데이터 분석팀',
    name: '박현수 수석연구원',
    role: '건강 데이터 분석 담당',
    photo: researcher2,
    summary: '유전자·건강검진 데이터 통합 분석',
  },
  {
    org: '제휴 의료기관 · 서울',
    name: '김대현 전문의',
    role: '의료자문 담당',
    photo: researcher3,
    summary: '검사 전 진료 및 의학적 소견 제공',
  },
]

/** 각 지역에서 중앙 분석소(가운데)로 들어오는 이송 경로 */
const HUB = { x: 156, y: 72 }
const ROUTES = [
  { name: '수도권', x: 56, y: 34, d: 'M56 34 C 98 50, 126 78, 156 72', label: { x: 56, y: 22 } },
  { name: '강원', x: 262, y: 30, d: 'M262 30 C 236 36, 196 70, 156 72', label: { x: 262, y: 18 } },
  { name: '영남', x: 250, y: 128, d: 'M250 128 C 220 104, 188 88, 156 72', label: { x: 250, y: 145 } },
  { name: '호남', x: 36, y: 120, d: 'M36 120 C 86 104, 108 64, 156 72', label: { x: 36, y: 137 } },
]
const SHIP_MS = 1400
const NEXT_MS = 3000

/** 검체(빛나는 점)가 지역 → 중앙 분석소로 차례로 이동. 지역 점을 누르면 그 경로로 바로 보냄 */
function LogisticsMap() {
  const [shot, setShot] = useState({ route: 0, n: 0 })
  const motion = useRef<SVGAnimateMotionElement>(null)

  // 새 검체가 그려지자마자(화면에 찍히기 전) 이동 시작
  useLayoutEffect(() => {
    motion.current?.beginElement()
  }, [shot])

  // 가만히 두면 다음 지역에서 자동으로 출발
  useEffect(() => {
    const t = window.setTimeout(() => setShot((s) => ({ route: (s.route + 1) % ROUTES.length, n: s.n + 1 })), NEXT_MS)
    return () => window.clearTimeout(t)
  }, [shot])

  const send = (route: number) => setShot((s) => ({ route, n: s.n + 1 }))
  const active = ROUTES[shot.route]

  return (
    <>
      <div className="lab-map">
        <svg viewBox="0 0 300 150" role="group" aria-label="전국에서 중앙 분석소로 이어지는 검체 이송 경로">
          {ROUTES.map((r, i) => (
            <path key={r.name} className={`lab-map-route${i === shot.route ? ' is-active' : ''}`} d={r.d} />
          ))}

          {/* 도착할 때 중앙 분석소에서 퍼지는 고리 */}
          <circle
            key={`ring-${shot.n}`}
            className="lab-map-ring"
            cx={HUB.x}
            cy={HUB.y}
            r="7"
            style={{ animationDelay: `${SHIP_MS - 100}ms` }}
          />
          <circle className="lab-map-hub" cx={HUB.x} cy={HUB.y} r="7" />
          {/* 중앙 분석소 이름: 가운데 점 바로 아래 */}
          <text className="lab-map-hub-name" x={HUB.x} y={HUB.y + 20}>
            제노플랜코리아
          </text>

          <circle key={`packet-${shot.n}`} className="lab-map-packet" r="3.5">
            <animateMotion
              ref={motion}
              begin="indefinite"
              dur={`${SHIP_MS}ms`}
              path={active.d}
              fill="freeze"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.45 0 0.25 1"
            />
          </circle>

          {ROUTES.map((r, i) => (
            <g
              key={r.name}
              className={`lab-map-stop${i === shot.route ? ' is-active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${r.name}에서 검체 보내기`}
              onClick={() => send(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  send(i)
                }
              }}
            >
              {/* 손가락으로 누르기 쉽게 넓은 투명 영역 */}
              <circle className="lab-map-hit" cx={r.x} cy={r.y} r="14" />
              <circle className="lab-map-node" cx={r.x} cy={r.y} r="4" />
              <text className="lab-map-name" x={r.label.x} y={r.label.y}>
                {r.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {/* 지도 위에 겹치면 잘 안 보여서 지도 바로 아래에 둠 */}
      <p className="lab-map-hint">지역을 눌러 검체를 보내 보세요</p>
    </>
  )
}

function Laboratory() {
  const pageRef = useReveal()

  return (
    <div ref={pageRef} className="lab-page">
      <main className="lab-main">
        {/* ---------- 소개 ---------- */}
        <section className="lab-card lab-intro lab-reveal" style={delay(0)}>
          <p className="lab-eyebrow">보건복지부 질병관리청 승인 공인 DTC 유전자검사기관</p>
          <h1 className="lab-title">
            제노플랜코리아 <em>연구소 소개</em>
          </h1>
          <p className="lab-lead">
            제노플랜코리아 연구소에 최첨단 NGS 시퀀싱 인프라를 구축하여, 검체 수거부터 72시간 내 99.9% 신뢰도의 질병
            감수성 변이(SNP) 분석을 완료합니다.
          </p>
        </section>

        {/* ---------- 시설 + 물류 (두 카드가 한 줄을 반씩) ---------- */}
        <div className="lab-top">

          <section className="lab-card lab-tall lab-reveal" style={delay(300)}>
            <h2 className="lab-card-title">제노플랜코리아 연구소</h2>
            <p className="lab-card-sub">
              생물학적 오염을 원천 차단하는 클린룸(Class 1,000 등급)과 전용 비상 전력망, 항온항습 무진동 특수 설비를
              갖춘 R&amp;D 메디컬 첨단 클러스터입니다.
            </p>
            <img className="lab-photo" src={labPhoto} alt="실험실에서 흰 가운을 입은 연구원들이 시료를 다루는 모습" />
            <ul className="lab-facts">
              {FACILITY.map((f) => (
                <li key={f.label}>
                  <small>{f.label}</small>
                  <strong>
                    {/* 주소처럼 미리 나눈 값은 줄마다 끊어 보여 줌 */}
                    {Array.isArray(f.value) ? f.value.map((line) => <span key={line}>{line}</span>) : f.value}
                  </strong>
                  <span>{f.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="lab-card lab-tall lab-reveal" style={delay(400)}>
            <h2 className="lab-card-title">신속 검체 이송 및 방역 물류 허브</h2>
            <p className="lab-card-sub">
              전국 병의원 및 다이렉트 키트 발송 고객을 위해 콜드체인(Cold-chain) 특수 운송망과 연계되어 검체 채취 즉시
              24시간 내 중앙 연구소로 입고됩니다.
            </p>
            <LogisticsMap />
            <dl className="lab-logistics">
              {LOGISTICS.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* ---------- 연구 프로세스 ---------- */}
        <section className="lab-card lab-process-card lab-reveal" style={delay(0)}>
          <h2 className="lab-card-title">연구 프로세스 안내</h2>
          <ol className="lab-process">
            {PROCESS.map((p, i) => (
              <li key={p.title} className="lab-reveal" style={delay(120 + i * 100)}>
                <span className="lab-step">{p.title}</span>
                <p>
                  {p.desc.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
                {i < PROCESS.length - 1 && <Icon d={ICONS.chevron} className="lab-icon lab-step-next" />}
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- 장비 · 인증 ---------- */}
        <div className="lab-grid lab-grid-wide">
          <section className="lab-card lab-reveal" style={delay(0)}>
            <h2 className="lab-card-title">분석 장비 규격 및 연구 랩 사양표</h2>
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>구분 / 장비명</th>
                    <th>제조사 / 규격</th>
                    <th>분석 역량 및 성능</th>
                  </tr>
                </thead>
                <tbody>
                  {EQUIPMENT.map(([name, maker, spec]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{maker}</td>
                      <td>{spec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="lab-card lab-reveal" style={delay(120)}>
            <h2 className="lab-card-title">정부 공인 및 글로벌 인증 체계</h2>
            <p className="lab-card-sub">
              생명윤리 및 개인정보보호 법률을 빈틈없이 충족하는 3중 컴플라이언스 시스템을 운영합니다.
            </p>
            <ul className="lab-certs">
              {CERTS.map((c) => (
                <li key={c}>
                  <CheckBadge />
                  {c}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---------- 연구진 및 의료 협력 네트워크 ---------- */}
        <section className="lab-card lab-reveal" style={delay(0)}>
          <h2 className="lab-card-title">연구진 및 의료 협력 네트워크</h2>
          <ul className="lab-team">
            {RESEARCHERS.map((r, i) => (
              <li key={r.name} className="lab-reveal" style={delay(120 + i * 120)}>
                <div className="lab-person">
                  <img className="lab-avatar" src={r.photo} alt={`${r.name} 프로필 사진`} />
                  <div>
                    <p className="lab-role">{r.org}</p>
                    <h3 className="lab-name">{r.name}</h3>
                    <p className="lab-school">{r.role}</p>
                  </div>
                </div>
                <p className="lab-summary">{r.summary}</p>
              </li>
            ))}
          </ul>
          <p className="lab-team-note">역할 배치 예시이며 실제 인물의 자격·소속·제휴 현황을 확인한 내용은 아님.</p>
        </section>

        {/* ---------- 연결 배너 ---------- */}
        <section className="lab-cta lab-reveal" style={delay(0)}>
          <div className="lab-cta-body">
            <p className="lab-cta-eyebrow">NEXT GENERATION INSURATECH</p>
            <h2>암, 뇌, 심장 위험도도 볼 수 있어요</h2>
          </div>
          <Link to="/insurance" className="lab-cta-btn">
            내 유전자 맞춤 보험 설계하기
            <Icon d={ICONS.arrow} />
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Laboratory
