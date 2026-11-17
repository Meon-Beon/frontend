import { BrowserRouter, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout/Layout'
import Company from './pages/company/company'
import DnaApply from './pages/dna-apply/DnaApply'
import EventPage from './pages/event/event'
import HealthHistory from './pages/health-history/HealthHistory'
import InsuranceSetting from './pages/insurance_setting/insurance_setting'
import Intro from './pages/intro/Intro'
import Laboratory from './pages/laboratory/laboratory'
import Login from './pages/login/Login'
import Main from './pages/main/Main'
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

        {/* 서비스 메인부터는 공통 헤더 아래에 표시. 새 페이지는 여기에 추가 */}
        <Route element={<Layout />}>
          {/* 로그인했을 때만 접근 가능 */}
          <Route
            path="/main"
            element={
              <RequireAuth>
                <Main />
              </RequireAuth>
            }
          />
          <Route path="/company" element={<Company />} />
          <Route path="/lab" element={<Laboratory />} />
          <Route path="/insurance" element={<InsuranceSetting />} />
          <Route path="/support" element={<ServiceCenter />} />
          <Route path="/dna-apply" element={<DnaApply />} />
          <Route path="/health-history" element={<HealthHistory />} />
          <Route path="/report" element={<ReportCheck />} />
          <Route path="/event" element={<EventPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
