import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Intro from './pages/intro/Intro'
import Login from './pages/login/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
