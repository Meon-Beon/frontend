import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Intro from './pages/intro/Intro'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
