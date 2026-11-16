import { useEffect } from 'react'
import type { DnaPaymentResult } from '../../api/dna'
// 약관동의 팝업과 같은 틀(dc-*)을 쓰고, 결제완료 전용 스타일만 따로 둠
import '../DNA_check/DNA_check.css'
import './DNA_paycomplete.css'

/* 4-3 결제완료 팝업 — 토스 결제 후 dna-apply로 돌아오면 열림 */

export type PayState =
  | { status: 'confirming' }
  | { status: 'done'; result: DnaPaymentResult }
  | { status: 'error'; message: string }

type Props = {
  /** null이면 닫힘 */
  state: PayState | null
  onClose: () => void
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })

export default function DNA_paycomplete({ state, onClose }: Props) {
  // 승인 확인 중에는 닫지 못하게 함
  const closable = state !== null && state.status !== 'confirming'

  useEffect(() => {
    if (!state) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closable && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [state, closable, onClose])

  if (!state) return null

  return (
    <div className="dc-backdrop" onClick={closable ? onClose : undefined}>
      <div
        className="dc-modal pc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-title"
        aria-busy={state.status === 'confirming'}
        onClick={(e) => e.stopPropagation()}
      >
        {state.status === 'confirming' && (
          <div className="pc-body">
            <span className="pc-spinner" aria-hidden="true" />
            <h2 id="pc-title">결제를 확인하고 있어요</h2>
            <p className="pc-sub">잠시만 기다려 주세요. 창을 닫지 마세요.</p>
          </div>
        )}

        {state.status === 'done' && (
          <>
            <div className="pc-body">
              <span className="pc-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 id="pc-title">결제가 완료되었어요</h2>
              <p className="pc-sub">검사 키트 배송을 준비할게요.</p>

              <dl className="pc-info">
                <div>
                  <dt>상품</dt>
                  <dd>{state.result.order_name}</dd>
                </div>
                <div>
                  <dt>결제금액</dt>
                  <dd className="pc-amount">{won(state.result.amount)}</dd>
                </div>
                {state.result.method && (
                  <div>
                    <dt>결제수단</dt>
                    <dd>{state.result.method}</dd>
                  </div>
                )}
                {state.result.approved_at && (
                  <div>
                    <dt>결제일시</dt>
                    <dd>{dateTime(state.result.approved_at)}</dd>
                  </div>
                )}
                <div>
                  <dt>주문번호</dt>
                  <dd className="pc-mono">{state.result.order_id}</dd>
                </div>
              </dl>
            </div>

            <footer className="dc-foot pc-foot">
              {state.result.receipt_url && (
                <a className="pc-receipt" href={state.result.receipt_url} target="_blank" rel="noreferrer">
                  영수증 보기
                </a>
              )}
              <button type="button" className="dc-pay" onClick={onClose}>
                확인
              </button>
            </footer>
          </>
        )}

        {state.status === 'error' && (
          <>
            <div className="pc-body">
              <span className="pc-icon pc-icon--error" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 7v6M12 17h.01" />
                </svg>
              </span>
              <h2 id="pc-title">결제를 완료하지 못했어요</h2>
              <p className="pc-sub">{state.message}</p>
            </div>
            <footer className="dc-foot pc-foot">
              <button type="button" className="dc-pay" onClick={onClose}>
                닫기
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
