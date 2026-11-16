import axios from 'axios'
import { client } from './client'

/* DNA 검사 결제 API (server/app/routers/dna.py) */

export type DnaOrder = { order_id: string; order_name: string; amount: number }

export type DnaPaymentResult = DnaOrder & {
  method: string | null
  approved_at: string | null
  receipt_url: string | null
}

/** 결제창을 띄우기 전에 서버에 주문을 만들고, 서버가 정한 주문번호·금액을 받음 */
export async function createDnaOrder(userId?: number) {
  const { data } = await client.post<DnaOrder>('/api/dna/orders', { user_id: userId ?? null })
  return data
}

/** 토스 결제 후 돌아왔을 때 서버에 승인을 요청 (서버가 금액 검증 후 토스 승인 API 호출) */
export async function confirmDnaPayment(body: { payment_key: string; order_id: string; amount: number }) {
  const { data } = await client.post<DnaPaymentResult>('/api/dna/payments/confirm', body)
  return data
}

/** 서버가 내려준 오류 문구(detail)를 꺼냄 */
export function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
    return error.response.data.detail
  }
  return fallback
}
