import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Intro from './pages/intro/Intro'
import Login from './pages/login/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/login" element={<Login />} />
        {/* TODO: pages/main/Main.tsx가 완성되면 element={<Main />}으로 교체 */}
        <Route path="/main" element={<h1>메인 화면 (임시)</h1>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
