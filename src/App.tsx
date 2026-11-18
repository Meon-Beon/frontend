import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout/Layout'
import Company from './pages/company/company'
import DnaApply from './pages/dna-apply/DnaApply'
import EventPage from './pages/event/event'
import HealthHistory from './pages/health-history/HealthHistory'
import Insurance from './pages/insurance/Insurance'
import Intro from './pages/intro/Intro'
import Laboratory from './pages/laboratory/laboratory'
import Login from './pages/login/Login'
import Main from './pages/main/Main'
import MyPage from './pages/mypage/MyPage'
import KakaoCallback from './pages/oauth/KakaoCallback'
import ReportCheck from './pages/report/Report'
import ServiceCenter from './pages/service_center/service_center'
import Signup from './pages/signup/Signup'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* 카카오 로그인 후 돌아오는 주소. 카카오 앱에 등록한 리다이렉트 URI 와 같아야 함 */}
        <Route path="/oauth/kakao" element={<KakaoCallback />} />

        {/* 서비스 메인부터는 공통 헤더 아래에 표시. 새 페이지는 여기에 추가 */}
        <Route element={<Layout />}>
          {/* 누구나 볼 수 있는 페이지 */}
          <Route path="/company" element={<Company />} />
          <Route path="/lab" element={<Laboratory />} />
          <Route path="/insurance" element={<Insurance />} />
          <Route path="/support" element={<ServiceCenter />} />
          <Route path="/event" element={<EventPage />} />
          {/* TODO: 비회원 주문을 막기로 하면 아래 로그인 필요 그룹으로 옮기기 */}
          <Route path="/dna-apply" element={<DnaApply />} />

          {/* 로그인했을 때만 볼 수 있는 페이지. 개인 정보가 나오는 새 페이지는 여기에 추가 */}
          <Route element={<RequireAuth />}>
            <Route path="/main" element={<Main />} />
            <Route path="/health-history" element={<HealthHistory />} />
            <Route path="/report" element={<ReportCheck />} />
            <Route path="/mypage" element={<MyPage />} />
          </Route>
        </Route>

        {/* 없는 주소로 들어오면 첫 화면으로 보냄 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
