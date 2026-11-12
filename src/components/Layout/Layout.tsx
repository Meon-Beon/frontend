import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'

/** 서비스 메인부터의 페이지 공통 틀: 맨 위에 헤더, 그 아래 각 페이지 */
function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}

export default Layout
