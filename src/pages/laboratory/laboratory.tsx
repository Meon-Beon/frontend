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
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
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

/** 꽉 찬 민트 원 안의 남색 체크 (인증 배지 느낌) */
function CheckBadge() {
  return (
    <svg className="lab-check" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.8 10.4l2.8 2.8 5.6-6" />
    </svg>
  )
}

const STATS = [
  { value: '99.9', unit: '%', desc: '공인 임상 시퀀싱 일치율 보증' },
  { value: '72', unit: 'H', desc: '검체 수거 후 리포트 발급 쾌속 파이프라인' },
]

const FACILITY = [
  { label: 'LOCATION', value: '경기도 성남시 분당구 판교로228번길 15', desc: '판교세븐벤처밸리 1단지 제3동 8층' },
  { label: 'CLEAN SYSTEM', value: 'HEPA H14 필터', desc: '교차오염 제로화 격벽 음압실' },
  { label: 'DATA ENCRYPTION', value: 'AES-256 GCM', desc: '원외 반출 불가 인트라넷 보관' },
  { label: 'POWER', value: '이중화 비상 전력망', desc: 'UPS · 발전기 연동 24시간 무중단 가동' },
]

const LOGISTICS = [
  ['검체 이송', '콜드체인 실시간 온도 모니터링 (4°C ± 1°C 유지)'],
  ['입고 시간', '채취 후 24시간 내 중앙 연구소 입고'],
  ['배송 범위', '전국 병의원 및 다이렉트 키트 신청 고객'],
  ['위치 추적', '바코드 기반 검체 위치 실시간 확인'],
  ['분석기관', '질병관리청 DTC 유전자검사기관 승인'],
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

const RESEARCHERS = [
  {
    name: '이도연 박사',
    role: '제노플랜코리아 연구소',
    photo: researcher1,
    school: 'Harvard University',
    career: ['前 미국 국립인간유전체연구소(NHGRI) 방문연구원', '한국인 질병 감수성 관련 SCI급 논문 45편 이상 게재', '보건복지부 유전자분석 질평가 심의위원'],
    field: '집단 유전학 · 질병 감수성 SNP 분석',
  },
  {
    name: '박현수 수석연구원',
    role: '바이오인포매틱스 랩',
    photo: researcher2,
    school: '서울대학교 유전체학 박사',
    career: ['대용량 초병렬 NGS 파이프라인 자동화 아키텍처 구축', '머신러닝 기반 다인자 질병 위험도(PRS) 산출 모델 개발', 'ISO/IEC 27001 유전체 비식별화 보안 프로토콜 총괄'],
    field: '알고리즘 파이프라인 · 유전체 암호화',
  },
  {
    name: '김대현 내과전문의',
    role: '메디컬 자문의원단',
    photo: researcher3,
    school: 'Stanford University',
    career: ['대학병원 임상유전체 진료 및 임상시험 코디네이션 18년', '한국인 유전 변이와 보험 언더라이팅 가이드라인 수립', '대한진단유전의학회 정회원'],
    field: '임상 판단 연계 · 위험도 의학 검증',
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
      <span className="lab-map-label">
        <Icon d={ICONS.pin} />
        제노플랜코리아 중앙 분석소
      </span>
      <span className="lab-map-hint">지역을 눌러 검체를 보내 보세요</span>
    </div>
  )
}

function Laboratory() {
  const pageRef = useReveal()

  return (
    <div ref={pageRef} className="lab-page">
      <main className="lab-main">
        {/* ---------- 소개 ---------- */}
        <section className="lab-card lab-intro lab-reveal" style={delay(0)}>
          <p className="lab-eyebrow">
            보건복지부 질병관리청 승인 공인 DTC 유전자검사기관
          </p>
          <h1 className="lab-title">
            한국유전자정보센터 <em>연구소 소개</em>
          </h1>
          <p className="lab-lead">
            제노플랜코리아 연구소에 최첨단 NGS 시퀀싱 인프라를 구축하여, 검체 수거부터 72시간 내
            99.9% 신뢰도의 질병 감수성 변이(SNP) 분석을 완료합니다.
          </p>
        </section>

        {/* ---------- 핵심 수치 + 시설 + 물류 ---------- */}
        <div className="lab-top">
          <ul className="lab-stats">
            {STATS.map((s, i) => (
              <li key={s.value} className="lab-card lab-reveal" style={delay(120 + i * 90)}>
                <strong className="lab-stat-num">
                  {s.value}
                  <small>{s.unit}</small>
                </strong>
                <span>{s.desc}</span>
              </li>
            ))}
          </ul>

          <section className="lab-card lab-tall lab-reveal" style={delay(300)}>
            <h2 className="lab-card-title">제노플랜코리아 연구소</h2>
            <p className="lab-card-sub">
              생물학적 오염을 원천 차단하는 클린룸(Class 1,000 등급)과 전용 비상 전력망,
              항온항습 무진동 특수 설비를 갖춘 R&amp;D 메디컬 첨단 클러스터입니다.
            </p>
            <img className="lab-photo" src={labPhoto} alt="클린룸에서 연구원들이 분석 장비를 다루는 모습" />
            <ul className="lab-facts">
              {FACILITY.map((f) => (
                <li key={f.label}>
                  <small>{f.label}</small>
                  <strong>{f.value}</strong>
                  <span>{f.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="lab-card lab-tall lab-reveal" style={delay(400)}>
            <h2 className="lab-card-title">신속 검체 이송 및 방역 물류 허브</h2>
            <p className="lab-card-sub">
              전국 병의원 및 다이렉트 키트 발송 고객을 위해 콜드체인(Cold-chain) 특수 운송망과
              연계되어 검체 채취 즉시 24시간 내 중앙 연구소로 입고됩니다.
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
        <section className="lab-card lab-reveal" style={delay(0)}>
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
                {i < PROCESS.length - 1 && (
                  <Icon d={ICONS.chevron} className="lab-icon lab-step-next" />
                )}
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
              생명윤리 및 개인정보보호 법률을 빈틈없이 충족하는 3중 컴플라이언스 시스템을
              운영합니다.
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

        {/* ---------- 연구진 ---------- */}
        <section className="lab-card lab-reveal" style={delay(0)}>
          <div className="lab-team-head">
            <h2 className="lab-card-title">한국유전자정보센터 연구진 및 메디컬 자문의원단</h2>
            <p className="lab-card-sub">
              유전체학 박사, 생물정보학(Bioinformatics) 엔지니어, 대학병원 전문의로 구성된 교차
              검증단이 데이터의 신뢰성을 완성합니다.
            </p>
          </div>
          <ul className="lab-team">
            {RESEARCHERS.map((r, i) => (
              <li key={r.name} className="lab-reveal" style={delay(120 + i * 120)}>
                <div className="lab-person">
                  <img className="lab-avatar" src={r.photo} alt={`${r.name} 프로필 사진`} />
                  <div>
                    <p className="lab-role">{r.role}</p>
                    <h3 className="lab-name">{r.name}</h3>
                    <p className="lab-school">{r.school}</p>
                  </div>
                </div>
                <ul className="lab-career">
                  {r.career.map((c) => (
                    <li key={c}>
                      <span className="lab-dash" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="lab-field">전문분야: {r.field}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- 연결 배너 ---------- */}
        <section className="lab-cta lab-reveal" style={delay(0)}>
          <div className="lab-cta-body">
            <p className="lab-cta-eyebrow">NEXT GENERATION INSURATECH PIPELINE</p>
            <h2>한국유전자정보센터의 초정밀 분석 데이터는 '내진설계' 엔진으로 직결됩니다</h2>
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
