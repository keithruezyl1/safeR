import './App.css'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Escrow from './components/Escrow'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/escrow" element={<Escrow />} />
    </Routes>
  )
}

export default App
