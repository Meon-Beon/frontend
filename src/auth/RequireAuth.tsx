import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { readUser } from './session'

/** 로그인한 사용자만 볼 수 있는 페이지. 로그인 정보가 없으면 로그인 페이지로 보냄 */
function RequireAuth({ children }: { children: ReactNode }) {
  if (!readUser()) return <Navigate to="/login" replace />
  return children
}

export default RequireAuth
