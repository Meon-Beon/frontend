import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/dna'
import { fetchSavedDesign, type SavedDesign } from '../../api/insurance'
import { changePassword, fetchMe, fetchOrders, updateMe, type Me, type Order } from '../../api/me'
import { readUser } from '../../auth/session'
import { loadPostcode } from '../../utils/postcode'
import './mypage.css'

/*
 * 마이페이지 (피그마 "마이페이지" 화면을 다른 페이지와 같은 남색 테마로)
 * 왼쪽 메뉴: 회원 기본 정보(탭) / 건강리포트 보러가기(/report 로 이동) / 보험 설계 보러가기(탭)
 * - 회원 기본 정보: 회원 정보 + 정보 수정(연락처·주소), 비밀번호 변경, 결제 내역
 * - 보험 설계 보러가기: 보험설계 화면에서 "설계 저장"한 상품들
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

/* ---------- 보험 설계 보러가기 (저장한 설계) ---------- */

function SavedDesignCard({ saved }: { saved: SavedDesign }) {
  if (!saved.saved_at || saved.products.length === 0) {
    return (
      <Card title="내가 저장한 보험 설계">
        <div className="mp-empty">
          <p>아직 저장한 설계가 없어요. GENE 보험설계에서 마음에 드는 보험을 담고 "설계 저장"을 눌러 주세요.</p>
          <Link to="/insurance" className="mp-cta">
            보험 설계하러 가기 <Icon d={ICON.arrow} />
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="내가 저장한 보험 설계"
      desc={`${ymdhm(saved.saved_at)}에 저장한 설계예요.`}
      action={
        <Link to="/insurance" className="mp-ghost">
          <Icon d={ICON.edit} /> 보험설계에서 수정하기
        </Link>
      }
    >
      <dl className="mp-saved-sum">
        <div>
          <dt>설계된 보험</dt>
          <dd>총 {saved.products.length}건</dd>
        </div>
        <div>
          <dt>예상 월 보험료 합계</dt>
          <dd>
            <strong>{won(saved.total_premium)}</strong> 원
          </dd>
        </div>
      </dl>

      <ul className="mp-saved">
        {saved.products.map((p) => {
          const url = safeUrl(p.join_url)
          const coverages = keyCoverages(p.coverages, p.target_diseases)
          return (
            <li key={p.id}>
              <div className="mp-saved-top">
                <span className="mp-company">{p.company_name}</span>
                <span className="mp-chips">
                  {p.target_diseases.map((d) => (
                    <i key={d}>
                      {d}
                    </i>
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
                  <a className="mp-link" href={url} target="_blank" rel="noopener noreferrer">
                    보험사에서 가입하기 <Icon d={ICON.external} />
                  </a>
                ) : (
                  <span className="mp-muted">가입 링크 준비 중</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
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
  const [saved, setSaved] = useState<SavedDesign | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    Promise.all([fetchMe(user.id), fetchOrders(user.id), fetchSavedDesign(user.id)])
      .then(([m, o, s]) => {
        if (ignore) return
        setMe(m)
        setOrders(o)
        setSaved(s)
      })
      .catch((e) => !ignore && setError(errorMessage(e, '회원 정보를 불러오지 못했어요. 서버가 켜져 있는지 확인해 주세요.')))
    return () => {
      ignore = true
    }
  }, [user.id])

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
            {!error && (!me || !saved) && <p className="mp-loading">회원 정보를 불러오는 중이에요.</p>}

            {me && saved && tab === 'info' && (
              <>
                <ProfileCard me={me} onSaved={setMe} />
                <div className="mp-grid">
                  <PasswordCard me={me} />
                  <OrdersCard orders={orders} />
                </div>
              </>
            )}
            {me && saved && tab === 'insurance' && <SavedDesignCard saved={saved} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyPage
