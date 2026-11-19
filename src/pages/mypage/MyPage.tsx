import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/dna'
import { deleteReport, fetchReports, type SavedProduct, type SavedReport } from '../../api/insurance'
import { changePassword, fetchMe, fetchOrders, updateMe, type Me, type Order } from '../../api/me'
import { readUser } from '../../auth/session'
import { loadPostcode } from '../../utils/postcode'
import './mypage.css'

/*
 * 마이페이지 (피그마 "마이페이지" 화면을 다른 페이지와 같은 남색 테마로)
 * 왼쪽 메뉴: 회원 기본 정보(탭) / 건강리포트 보러가기(/report 로 이동) / 보험 설계 보러가기(탭)
 * - 회원 기본 정보: 회원 정보 + 정보 수정(연락처·주소), 비밀번호 변경, 결제 내역
 * - 보험 설계 보러가기: 보험설계 화면에서 "리포트로 저장"한 리포트들 (리포트 1개 = 보험 여러 개 조합, 옆으로 끌어서 넘김)
 * 주소의 ?tab=insurance 로 바로 열 수 있음 (보험설계 화면의 저장 완료 링크)
 */

type Tab = 'info' | 'insurance'

const won = (n: number) => n.toLocaleString('ko-KR')
/** "2026-11-16T14:23:00" → "2026.11.16" */
const ymd = (s: string | null) => (s ? s.slice(0, 10).replace(/-/g, '.') : '-')
/** "2026-11-16T14:23:00" → "2026.11.16 14:23" */
const ymdhm = (s: string | null) => (s ? `${ymd(s)} ${s.slice(11, 16)}` : '-')

/** 만 나이 (생일이 지났는지까지 따짐) */
function koreanAge(birth: string) {
  const [y, m, d] = birth.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1
  return age
}

/** "01012341234" → "010-1234-****" (화면에는 끝 4자리를 가림) */
function maskPhone(phone: string | null) {
  if (!phone) return '등록된 연락처가 없어요'
  const m = phone.match(/^(\d{3})(\d{3,4})(\d{4})$/)
  return m ? `${m[1]}-${m[2]}-****` : phone
}

/** 상품명 끝의 판매 코드((2601), (26.07) 등)와 밑줄은 화면에서 뺌 */
const cleanName = (name: string) =>
  name
    .replace(/\([\d.]+\)/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** 대상 질병과 관련된 보장을 앞으로 (KB처럼 보장이 28개인 상품도 핵심 보장이 먼저 보이게) */
const DISEASE_KEYWORDS: Record<string, string[]> = {
  심장: ['심장', '심근', '협심증'],
  뇌혈관: ['뇌'],
  당뇨: ['당뇨'],
  고혈압: ['고혈압'],
  치매: ['치매', '장기요양'],
  대장암: ['암'],
}
function keyCoverages<T extends { coverage_name: string }>(coverages: T[], diseases: string[]) {
  const words = diseases.flatMap((d) => DISEASE_KEYWORDS[d] ?? [d])
  const related = coverages.filter((c) => words.some((w) => c.coverage_name.includes(w)))
  return [...related, ...coverages.filter((c) => !related.includes(c))]
}

const safeUrl = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null)

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
const ICON = {
  chevron: 'M9 6l6 6-6 6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  left: 'M15 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  close: 'M6 6l12 12M18 6L6 18',
}

function Card({ title, desc, action, children, className = '' }: { title: string; desc?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mp-card ${className}`}>
      <header className="mp-card-head">
        <div>
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

function Status({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <p role="status" className={`mp-msg${msg.ok ? ' is-ok' : ''}`}>
      {msg.text}
    </p>
  )
}

/* ---------- 회원 기본 정보 + 정보 수정 ---------- */

function ProfileCard({ me, onSaved }: { me: Me; onSaved: (me: Me) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: '', zipcode: '', address: '', address_detail: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const startEdit = () => {
    setForm({
      phone: me.phone ?? '',
      zipcode: me.zipcode ?? '',
      address: me.address ?? '',
      address_detail: me.address_detail ?? '',
    })
    setMsg(null)
    setEditing(true)
  }

  const searchAddress = async () => {
    try {
      const Postcode = await loadPostcode()
      new Postcode({
        oncomplete: (data) =>
          setForm((f) => ({ ...f, zipcode: data.zonecode, address: data.roadAddress || data.jibunAddress, address_detail: '' })),
      }).open()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : '주소 검색을 열지 못했어요.' })
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^01[016789]\d{7,8}$/.test(form.phone)) return setMsg({ ok: false, text: '휴대폰 번호를 숫자만 정확히 입력해 주세요.' })
    setSaving(true)
    try {
      const updated = await updateMe(me.id, form)
      onSaved(updated)
      setEditing(false)
      setMsg({ ok: true, text: '회원 정보를 수정했어요.' })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err, '정보를 수정하지 못했어요.') })
    } finally {
      setSaving(false)
    }
  }

  const birth = me.birth_date
    ? `${ymd(me.birth_date)} (만 ${koreanAge(me.birth_date)}세 / ${me.gender === 'F' ? '여성' : '남성'})`
    : '등록된 정보가 없어요'
  const address = me.address ? `(${me.zipcode}) ${me.address}${me.address_detail ? ` ${me.address_detail}` : ''}` : '등록된 주소가 없어요'

  return (
    <section className="mp-card mp-profile">
      <header className="mp-profile-head">
        <span className="mp-avatar" aria-hidden="true">
          {(me.name ?? '회')[0]}
        </span>
        <div>
          <h2>
            {me.name ?? '회원'} <small>님</small>
          </h2>
          <p>
            가입일 {ymd(me.created_at)} · {me.login_type === 'kakao' ? '카카오 로그인' : '아이디 로그인'}
          </p>
        </div>
        {!editing && (
          <button type="button" className="mp-ghost" onClick={startEdit}>
            <Icon d={ICON.edit} /> 정보 수정
          </button>
        )}
      </header>

      {editing ? (
        <form className="mp-edit" onSubmit={onSubmit} noValidate>
          <label className="mp-field">
            <span>연락처</span>
            <input
              inputMode="numeric"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              placeholder="숫자만 입력 (01012345678)"
            />
          </label>
          <div className="mp-field">
            <span>배송지 주소</span>
            <div className="mp-row">
              <input value={form.zipcode} readOnly placeholder="우편번호" aria-label="우편번호" className="mp-zip" />
              <button type="button" className="mp-ghost" onClick={searchAddress}>
                <Icon d={ICON.search} /> 주소 검색
              </button>
            </div>
            <input value={form.address} readOnly placeholder="주소 검색을 눌러 주세요" aria-label="주소" />
            <input
              value={form.address_detail}
              onChange={(e) => setForm({ ...form, address_detail: e.target.value })}
              placeholder="상세 주소"
              aria-label="상세 주소"
            />
          </div>
          <Status msg={msg} />
          <div className="mp-actions">
            <button type="button" className="mp-ghost" onClick={() => setEditing(false)}>
              취소
            </button>
            <button type="submit" className="mp-cta" disabled={saving}>
              {saving ? '저장하는 중…' : '수정 완료'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mp-info">
            <div>
              <dt>생년월일 / 성별</dt>
              <dd>{birth}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd>{maskPhone(me.phone)}</dd>
            </div>
            <div>
              <dt>로그인 방식</dt>
              <dd>{me.login_type === 'kakao' ? '카카오 계정' : `아이디 ${me.login_id}`}</dd>
            </div>
            <div>
              <dt>배송지 주소</dt>
              <dd>{address}</dd>
            </div>
          </dl>
          <Status msg={msg} />
        </>
      )}
    </section>
  )
}

/* ---------- 비밀번호 변경 ---------- */

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

function PasswordCard({ me }: { me: Me }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (!me.has_password) {
    return (
      <Card title="비밀번호 변경" desc="안전한 계정 사용을 위해 주기적으로 비밀번호를 변경해 주세요.">
        <p className="mp-empty">카카오 계정으로 가입해서 따로 비밀번호가 없어요. 카카오 로그인으로 이용해 주세요.</p>
      </Card>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!current) return setMsg({ ok: false, text: '현재 비밀번호를 입력해 주세요.' })
    if (!PASSWORD_RULE.test(next)) return setMsg({ ok: false, text: '새 비밀번호는 영문, 숫자, 특수문자를 조합해 8자 이상이어야 해요.' })
    if (next !== confirm) return setMsg({ ok: false, text: '새 비밀번호 확인이 일치하지 않아요.' })
    setSaving(true)
    setMsg(null)
    try {
      await changePassword(me.id, current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setMsg({ ok: true, text: '비밀번호를 변경했어요. 다음 로그인부터 새 비밀번호를 써 주세요.' })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err, '비밀번호를 변경하지 못했어요.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="비밀번호 변경" desc="안전한 계정 사용을 위해 주기적으로 비밀번호를 변경해 주세요.">
      <form className="mp-form" onSubmit={onSubmit} noValidate>
        <label className="mp-field">
          <span>현재 비밀번호</span>
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="현재 사용 중인 비밀번호" />
        </label>
        <label className="mp-field">
          <span>새 비밀번호</span>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="영문, 숫자, 특수문자 조합 8자 이상" />
        </label>
        <label className="mp-field">
          <span>새 비밀번호 확인</span>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="새 비밀번호를 한 번 더 입력" />
        </label>
        <Status msg={msg} />
        <div className="mp-actions">
          <button type="submit" className="mp-cta" disabled={saving}>
            <Icon d={ICON.check} /> {saving ? '변경하는 중…' : '비밀번호 변경 완료'}
          </button>
        </div>
      </form>
    </Card>
  )
}

/* ---------- 결제 내역 ---------- */

function OrdersCard({ orders }: { orders: Order[] }) {
  const total = orders.reduce((sum, o) => sum + o.amount, 0)
  return (
    <Card title="결제 내역" desc="내진(GENE)설계에서 결제한 DNA 검사 내역이에요.">
      {orders.length === 0 ? (
        <div className="mp-empty">
          <p>아직 결제 내역이 없어요.</p>
          <Link to="/dna-apply" className="mp-link">
            DNA 검사 신청하기 <Icon d={ICON.arrow} />
          </Link>
        </div>
      ) : (
        <>
          <ul className="mp-orders">
            {orders.map((o) => (
              <li key={o.order_id}>
                <div className="mp-order-top">
                  <span>
                    주문번호 <b>{o.order_id}</b>
                  </span>
                  <time>{ymdhm(o.approved_at)}</time>
                </div>
                <dl>
                  <div>
                    <dt>결제 상품</dt>
                    <dd>{o.order_name}</dd>
                  </div>
                  <div>
                    <dt>결제 수단</dt>
                    <dd>{o.method ?? '-'}</dd>
                  </div>
                  <div>
                    <dt>결제 금액</dt>
                    <dd>{won(o.amount)}원</dd>
                  </div>
                </dl>
                {safeUrl(o.receipt_url) && (
                  <a className="mp-link" href={safeUrl(o.receipt_url)!} target="_blank" rel="noopener noreferrer">
                    영수증 보기 <Icon d={ICON.external} />
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="mp-total">
            <span>최종 결제 금액</span>
            <strong>
              {won(total)}
              <small>원</small>
            </strong>
          </p>
        </>
      )}
    </Card>
  )
}

/* ---------- 보험 설계 보러가기 (저장한 리포트, 옆으로 끌어서 넘김) ---------- */

/** 리포트 하나 안의 상품 카드 */
function ReportProduct({ p }: { p: SavedProduct }) {
  const url = safeUrl(p.join_url)
  const coverages = keyCoverages(p.coverages, p.target_diseases)
  return (
    <li>
      <div className="mp-saved-top">
        <span className="mp-company">{p.company_name}</span>
        <span className="mp-chips">
          {p.target_diseases.map((d) => (
            <i key={d}>{d}</i>
          ))}
        </span>
      </div>
      <p className="mp-product">{cleanName(p.product_name)}</p>
      <ul className="mp-cov">
        {coverages.slice(0, 3).map((c, i) => (
          <li key={`${c.coverage_name}-${i}`}>
            {c.coverage_name}
            {c.coverage_amount && <b>{c.coverage_amount}</b>}
          </li>
        ))}
        {p.coverages.length > 3 && <li className="mp-more">외 보장 {p.coverages.length - 3}개</li>}
      </ul>
      <div className="mp-saved-foot">
        <span>
          월 예상 보험료 <strong>{p.premium == null ? '-' : won(p.premium)}</strong> 원
        </span>
        {url ? (
          <a className="mp-link" href={url} target="_blank" rel="noopener noreferrer" draggable={false}>
            보험사에서 가입하기 <Icon d={ICON.external} />
          </a>
        ) : (
          <span className="mp-muted">가입 링크 준비 중</span>
        )}
      </div>
    </li>
  )
}

/** "2026-11-19 10:26:00" → "26.11.19" (피그마 카드 제목용 짧은 날짜) */
const shortYmd = (s: string) => s.slice(2, 10).replace(/-/g, '.')
/** 리포트에 담은 상품들이 대비하는 질병 (겹치는 건 한 번만) */
const reportDiseases = (report: SavedReport) => [...new Set(report.products.flatMap((p) => p.target_diseases))]
/** 압축 카드에는 상품을 이만큼만, 나머지는 "외 n건" */
const PREVIEW_COUNT = 4

/** 리포트 카드 하나 = "리포트로 저장" 한 번. 상품명·가격만 압축해서 보여 주고, 자세한 건 "상세 리포트 열기" */
function ReportSlide({
  report,
  no,
  total,
  onDelete,
  onOpen,
}: {
  report: SavedReport
  no: number
  total: number
  onDelete: () => Promise<void>
  onOpen: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const diseases = reportDiseases(report)
  const preview = report.products.slice(0, PREVIEW_COUNT)
  const rest = report.products.length - preview.length

  const remove = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <li className="mp-report" aria-roledescription="slide" aria-label={`리포트 ${no} (전체 ${total}개 중)`}>
      <div className="mp-report-top">
        <p className="mp-report-no">
          REPORT {String(no).padStart(2, '0')} · {report.saved_at.slice(11, 16)}
        </p>
        {confirming ? (
          <div className="mp-report-confirm">
            <button type="button" className="mp-danger" onClick={remove} disabled={deleting}>
              {deleting ? '지우는 중…' : '삭제'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
              취소
            </button>
          </div>
        ) : (
          <button type="button" className="mp-icon-btn" onClick={() => setConfirming(true)} aria-label={`리포트 ${no} 삭제`}>
            <Icon d={ICON.trash} />
          </button>
        )}
      </div>

      <h3 className="mp-report-title">{shortYmd(report.saved_at)} 설계안</h3>
      <p className="mp-report-sub">
        {diseases.length > 0 ? `${diseases.join('·')} 대비 · ` : ''}보험 {report.products.length}건 조합
      </p>

      <div className="mp-report-total">
        <p>월 예상 납입료</p>
        <p>
          <strong>{won(report.total_premium)}</strong> 원 / 월
        </p>
      </div>

      <div className="mp-report-items">
        <p>담긴 상품 (총 {report.products.length}건)</p>
        <ul>
          {preview.map((p) => (
            <li key={p.id}>
              <span title={`${p.company_name} ${cleanName(p.product_name)}`}>
                {p.company_name} {cleanName(p.product_name)}
              </span>
              <b>{p.premium == null ? '-' : `${won(p.premium)}원`}</b>
            </li>
          ))}
          {rest > 0 && <li className="mp-report-rest">외 {rest}건</li>}
        </ul>
      </div>

      <button type="button" className="mp-report-open" onClick={onOpen}>
        상세 리포트 열기 <Icon d={ICON.arrow} />
      </button>
    </li>
  )
}

/** 상세 리포트 팝업: 담은 보험마다 핵심 보장·대비 질환·가입 링크, 이 조합으로 다시 설계 */
function ReportDetailModal({ report, no, onClose }: { report: SavedReport; no: number; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const diseases = reportDiseases(report)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // 팝업이 떠 있는 동안 뒤 화면은 스크롤되지 않게
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      opener?.focus() // 닫으면 "상세 리포트 열기" 버튼으로 초점을 돌려줌
    }
  }, [onClose])

  return (
    <div className="mp-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mp-modal" role="dialog" aria-modal="true" aria-labelledby="mp-modal-title">
        <header className="mp-modal-head">
          <div>
            <p className="mp-report-no">REPORT {String(no).padStart(2, '0')}</p>
            <h2 id="mp-modal-title">{shortYmd(report.saved_at)} 설계안 상세 리포트</h2>
            <p className="mp-muted">{ymdhm(report.saved_at)} 저장</p>
          </div>
          <button ref={closeRef} type="button" className="mp-round" aria-label="닫기" onClick={onClose}>
            <Icon d={ICON.close} />
          </button>
        </header>

        <div className="mp-modal-body">
          <dl className="mp-saved-sum">
            <div>
              <dt>담은 보험</dt>
              <dd>총 {report.products.length}건</dd>
            </div>
            <div>
              <dt>예상 월 보험료 합계</dt>
              <dd>
                <strong>{won(report.total_premium)}</strong> 원
              </dd>
            </div>
            {diseases.length > 0 && (
              <div className="mp-report-diseases">
                <dt>대비하는 질환</dt>
                <dd className="mp-chips">
                  {diseases.map((d) => (
                    <i key={d}>{d}</i>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          <ul className="mp-saved">
            {report.products.map((p) => (
              <ReportProduct key={p.id} p={p} />
            ))}
          </ul>
        </div>

        <footer className="mp-modal-foot">
          <button type="button" className="mp-ghost" onClick={onClose}>
            닫기
          </button>
          <Link to={`/insurance?report=${report.id}`} className="mp-cta">
            <Icon d={ICON.edit} /> 이 조합으로 다시 설계
          </Link>
        </footer>
      </div>
    </div>
  )
}

/** 끌기로 인정하는 최소 이동 거리(px). 이보다 적게 움직이면 클릭으로 봄 */
const DRAG_THRESHOLD = 6

/**
 * 리포트 캐러셀
 * - 터치: 브라우저 기본 가로 스크롤 + scroll-snap 으로 카드 단위로 멈춤
 * - 마우스: 누른 채로 좌우로 끌면 scrollLeft 를 직접 바꿈 (pointer 이벤트). 놓으면 가까운 카드로 맞춤
 * - 키보드: 목록에 초점을 두고 ←/→, 또는 아래 화살표 버튼·점
 */
function ReportCarousel({
  reports,
  onDelete,
  onOpen,
}: {
  reports: SavedReport[]
  onDelete: (id: number) => Promise<void>
  onOpen: (id: number) => void
}) {
  const trackRef = useRef<HTMLUListElement>(null)
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null)
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)
  // 끌기를 막 끝냈는지. pointerup 바로 뒤에 오는 click 을 막는 데 씀 (state 는 click 전에 이미 false 로 바뀔 수 있어 ref 로)
  const justDragged = useRef(false)
  const total = reports.length
  // 멈출 수 있는 위치 수. 넓은 화면에선 카드가 2장씩 보여 "리포트 수 - 1" 이 됨 (화면 폭이 바뀌면 다시 계산)
  const [pages, setPages] = useState(total)

  /** 카드 사이 간격까지 포함한 한 칸 너비 */
  const step = () => {
    const el = trackRef.current
    const [a, b] = [el?.children[0] as HTMLElement | undefined, el?.children[1] as HTMLElement | undefined]
    if (!a) return 1
    return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth
  }
  const indexNow = () => Math.round((trackRef.current?.scrollLeft ?? 0) / step())

  const goTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const next = Math.max(0, Math.min(pages - 1, i))
    el.scrollTo({ left: next * step(), behavior: 'smooth' })
    setActive(next)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setPages(Math.max(1, Math.round((el.scrollWidth - el.clientWidth) / step()) + 1))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [total])

  // 리포트를 지우거나 화면이 넓어져 위치 수가 줄면 현재 번호가 범위를 넘지 않게
  useEffect(() => {
    if (active > pages - 1) goTo(pages - 1)
  }, [pages]) // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    if (!drag.current) setActive(Math.max(0, Math.min(pages - 1, indexNow())))
  }

  const onPointerDown = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return // 터치는 브라우저 스크롤에 맡김
    drag.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false }
  }
  const onPointerMove = (e: PointerEvent<HTMLUListElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      // 실제로 끌기 시작했을 때만 포인터를 붙잡음 (처음부터 붙잡으면 버튼·링크 클릭이 안 먹음)
      d.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
    }
    e.currentTarget.scrollLeft = d.left - dx
  }
  const endDrag = (e: PointerEvent<HTMLUListElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 0)
    // 조금만 끌어도 넘어가게: 끈 방향으로 한 칸 (40px 미만이면 제자리)
    const dx = e.clientX - d.x
    const from = Math.round(d.left / step())
    goTo(Math.abs(dx) < 40 ? from : from + (dx < 0 ? 1 : -1))
  }
  /** 끌기가 끝난 직후의 클릭(링크 열기 등)은 막음 */
  const onClickCapture = (e: MouseEvent<HTMLUListElement>) => {
    if (justDragged.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.target !== e.currentTarget) return // 안쪽 버튼·링크에서 누른 키는 그대로
    if (e.key === 'ArrowRight') goTo(active + 1)
    else if (e.key === 'ArrowLeft') goTo(active - 1)
    else return
    e.preventDefault()
  }

  return (
    <div className="mp-carousel" role="region" aria-roledescription="carousel" aria-label="저장한 보험 설계 리포트">
      {pages > 1 && (
        <div className="mp-carousel-bar">
          <span className="mp-carousel-count">
            {/* 맨 왼쪽에 보이는 리포트가 몇 번째인지 / 전체 리포트 수 */}
            <b>{active + 1}</b> / {total}
          </span>
          <div className="mp-carousel-nav">
            <button type="button" className="mp-round" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="이전 리포트">
              <Icon d={ICON.left} />
            </button>
            <button type="button" className="mp-round" onClick={() => goTo(active + 1)} disabled={active === pages - 1} aria-label="다음 리포트">
              <Icon d={ICON.chevron} />
            </button>
          </div>
        </div>
      )}

      <ul
        ref={trackRef}
        className={`mp-track${dragging ? ' is-dragging' : ''}${total === 1 ? ' is-single' : ''}${pages === 1 ? ' is-static' : ''}`}
        tabIndex={0}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
      >
        {reports.map((r, i) => (
          // 오래된 리포트가 01번. 목록은 최근 것부터 오므로 번호는 거꾸로
          <ReportSlide
            key={r.id}
            report={r}
            no={total - i}
            total={total}
            onDelete={() => onDelete(r.id)}
            onOpen={() => onOpen(r.id)}
          />
        ))}
      </ul>

      {pages > 1 && (
        <div className="mp-dots">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === active ? 'is-active' : ''}
              aria-label={`${i + 1}번째 위치로 이동`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SavedReportsCard({ reports, onDelete }: { reports: SavedReport[]; onDelete: (id: number) => Promise<void> }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // 상세 리포트 팝업으로 연 리포트 id. null 이면 닫힘
  const [openId, setOpenId] = useState<number | null>(null)
  // 팝업의 useEffect 가 렌더마다 다시 돌지 않도록 같은 함수를 계속 넘김
  const closeDetail = useCallback(() => setOpenId(null), [])
  const openIndex = reports.findIndex((r) => r.id === openId)

  if (reports.length === 0) {
    return (
      <Card title="내가 저장한 보험 설계 리포트">
        <div className="mp-empty">
          <p>아직 저장한 리포트가 없어요. GENE 보험설계에서 마음에 드는 보험들을 담고 "리포트로 저장"을 눌러 주세요.</p>
          <Link to="/insurance" className="mp-cta">
            보험 설계하러 가기 <Icon d={ICON.arrow} />
          </Link>
        </div>
      </Card>
    )
  }

  const remove = async (id: number) => {
    setMsg(null)
    try {
      await onDelete(id)
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e, '리포트를 지우지 못했어요. 잠시 후 다시 시도해 주세요.') })
    }
  }

  return (
    <Card
      title="내가 저장한 보험 설계 리포트"
      desc={reports.length > 1 ? `설계안 ${reports.length}개 · 옆으로 끌어서 넘겨 보세요.` : '보험설계에서 저장한 조합이에요.'}
      action={
        <Link to="/insurance" className="mp-ghost">
          <Icon d={ICON.plus} /> 새 리포트 만들기
        </Link>
      }
    >
      <Status msg={msg} />
      <ReportCarousel reports={reports} onDelete={remove} onOpen={setOpenId} />
      {openIndex >= 0 && (
        <ReportDetailModal report={reports[openIndex]} no={reports.length - openIndex} onClose={closeDetail} />
      )}
    </Card>
  )
}

/* ---------- 화면 ---------- */

function MyPage() {
  const user = readUser()! // /mypage 는 RequireAuth 안쪽이라 항상 있음
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'insurance' ? 'insurance' : 'info'

  const [me, setMe] = useState<Me | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [reports, setReports] = useState<SavedReport[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    Promise.all([fetchMe(user.id), fetchOrders(user.id), fetchReports(user.id)])
      .then(([m, o, r]) => {
        if (ignore) return
        setMe(m)
        setOrders(o)
        setReports(r)
      })
      .catch((e) => !ignore && setError(errorMessage(e, '회원 정보를 불러오지 못했어요. 서버가 켜져 있는지 확인해 주세요.')))
    return () => {
      ignore = true
    }
  }, [user.id])

  // 서버에서 지운 뒤에 목록에서 뺌 (실패하면 목록은 그대로, 에러는 카드에서 보여 줌)
  const removeReport = async (id: number) => {
    await deleteReport(user.id, id)
    setReports((list) => list?.filter((r) => r.id !== id) ?? null)
  }

  const go = (t: Tab) => setParams(t === 'info' ? {} : { tab: t }, { replace: true })

  return (
    <div className="mp-page">
      <div className="mp-wrap">
        <h1 className="mp-title">마이페이지</h1>

        <div className="mp-layout">
          <aside className="mp-card mp-side" aria-label="마이 메뉴">
            <p className="mp-side-title">마이 메뉴</p>
            <nav>
              <button type="button" className={tab === 'info' ? 'is-active' : ''} aria-current={tab === 'info' ? 'page' : undefined} onClick={() => go('info')}>
                회원 기본 정보
              </button>
              {/* 메인 화면 "건강 종합 리포트" 카드와 같은 페이지 */}
              <Link to="/report">
                건강리포트 보러가기 <Icon d={ICON.chevron} />
              </Link>
              <button
                type="button"
                className={tab === 'insurance' ? 'is-active' : ''}
                aria-current={tab === 'insurance' ? 'page' : undefined}
                onClick={() => go('insurance')}
              >
                보험 설계 보러가기 <Icon d={ICON.chevron} />
              </button>
            </nav>
          </aside>

          <div className="mp-main">
            {error && <p className="mp-msg">{error}</p>}
            {!error && (!me || !reports) && <p className="mp-loading">회원 정보를 불러오는 중이에요.</p>}

            {me && reports && tab === 'info' && (
              <>
                <ProfileCard me={me} onSaved={setMe} />
                <div className="mp-grid">
                  <PasswordCard me={me} />
                  <OrdersCard orders={orders} />
                </div>
              </>
            )}
            {me && reports && tab === 'insurance' && <SavedReportsCard reports={reports} onDelete={removeReport} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyPage
