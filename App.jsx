import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import Home from './Home.jsx'
import Studio from './Studio.jsx'
import NotFound from './NotFound.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen animated-bg">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
