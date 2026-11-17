import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { readUser } from './session'

/**
 * 로그인한 사용자만 볼 수 있는 페이지.
 * - <RequireAuth><Page /></RequireAuth> 처럼 감싸거나
 * - <Route element={<RequireAuth />}> 아래에 라우트를 묶어서 쓸 수 있음 (이때는 <Outlet />에 자식 페이지가 그려짐)
 * 로그인 정보가 없으면 로그인 페이지로 보내면서, 원래 가려던 주소를 state.from 으로 넘김
 */
function RequireAuth({ children }: { children?: ReactNode }) {
  const location = useLocation()

  if (!readUser()) {
    const from = location.pathname + location.search + location.hash
    return <Navigate to="/login" replace state={{ from }} />
  }
  return children ?? <Outlet />
}

export default RequireAuth
