import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Company from './pages/company/company'
import Insurance from './pages/insurance/Insurance'
import Intro from './pages/intro/Intro'
import Laboratory from './pages/laboratory/laboratory'
import Login from './pages/login/Login'
import Main from './pages/main/Main'
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
          <Route path="/main" element={<Main />} />
          <Route path="/company" element={<Company />} />
          <Route path="/lab" element={<Laboratory />} />
          <Route path="/insurance" element={<Insurance />} />
          <Route path="/support" element={<ServiceCenter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
