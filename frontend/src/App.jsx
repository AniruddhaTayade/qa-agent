import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './features/home/HomePage'
import ResultsPage from './features/results/ResultsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
