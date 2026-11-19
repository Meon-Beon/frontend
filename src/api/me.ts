import { client } from './client'

/* 마이페이지 API (server/app/routers/me.py) */

export type Me = {
  id: number
  login_id: string
  name: string | null
  birth_date: string | null
  gender: 'M' | 'F' | null
  phone: string | null
  zipcode: string | null
  address: string | null
  address_detail: string | null
  created_at: string | null
  login_type: 'local' | 'kakao'
  /** 카카오 회원은 비밀번호가 없음 → 비밀번호 변경 불가 */
  has_password: boolean
}

export type ProfileUpdate = { phone: string; zipcode: string; address: string; address_detail: string }

export type Order = {
  order_id: string
  order_name: string
  amount: number
  method: string | null
  approved_at: string | null
  receipt_url: string | null
}

export async function fetchMe(userId: number) {
  const { data } = await client.get<Me>(`/api/me/${userId}`)
  return data
}

export async function updateMe(userId: number, body: ProfileUpdate) {
  const { data } = await client.patch<Me>(`/api/me/${userId}`, body)
  return data
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  await client.post(`/api/me/${userId}/password`, { current_password: currentPassword, new_password: newPassword })
}

export async function fetchOrders(userId: number) {
  const { data } = await client.get<{ orders: Order[] }>(`/api/me/${userId}/orders`)
  return data.orders
}
