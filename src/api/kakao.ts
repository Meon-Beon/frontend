import { isAxiosError } from 'axios'
import { client } from './client'
import type { SessionUser } from '../auth/session'

/* 카카오 로그인 API (server/app/routers/kakao.py) */

const STATE_KEY = 'gene:kakaoState'
const REDIRECT_KEY = 'gene:kakaoRedirect'

export type KakaoLoginResult =
  | { status: 'ok'; user: SessionUser }
  /** 처음 온 카카오 회원: ticket 을 들고 추가 정보 입력 → /signup */
  | { status: 'need_profile'; ticket: string; nickname: string | null }

export type KakaoSignupBody = {
  ticket: string
  name: string
  rrn_front: string
  rrn_back: string
  phone: string
}

/**
 * 카카오 로그인 화면으로 보낸다.
 * state: 돌아왔을 때 같은 값인지 비교해 다른 사이트가 끼워 넣은 로그인 요청(CSRF)을 막는 임의 값
 */
export async function startKakaoLogin(redirectPath: string) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(REDIRECT_KEY, redirectPath)
  const { data } = await client.get<{ url: string }>('/api/auth/kakao/login-url', { params: { state } })
  window.location.assign(data.url)
}

/** 돌아온 state 가 보낸 것과 같은지 확인하고, 로그인 뒤 갈 주소를 꺼낸다 (읽기만 함) */
export function readKakaoSession(state: string | null) {
  const saved = sessionStorage.getItem(STATE_KEY)
  const redirect = sessionStorage.getItem(REDIRECT_KEY) ?? '/main'
  return { valid: !!saved && saved === state, redirect }
}

/** state 는 한 번만 쓰도록 확인이 끝나면 지움 */
export function clearKakaoSession() {
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(REDIRECT_KEY)
}

export async function kakaoLogin(code: string) {
  const { data } = await client.post<KakaoLoginResult>('/api/auth/kakao/login', { code })
  return data
}

export async function kakaoSignup(body: KakaoSignupBody) {
  const { data } = await client.post<SessionUser>('/api/auth/kakao/signup', body)
  return data
}

/** 서버 오류 문구 꺼내기. FastAPI 입력 검사 오류(422)는 detail 이 배열이라 첫 메시지를 씀 */
export function kakaoError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    if (!error.response) return '서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.'
    const detail = error.response.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg.replace(/^Value error, /, '')
  }
  return fallback
}
