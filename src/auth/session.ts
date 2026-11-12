// 로그인한 사용자 정보를 브라우저에 보관. TODO: JWT가 생기면 토큰도 여기서 관리
const USER_KEY = 'gene:user'

export type SessionUser = { id: number; login_id: string; name?: string | null }

export function saveUser(user: SessionUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 건너뜀
  }
}

export function readUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(USER_KEY)
  } catch {
    // 무시
  }
}
