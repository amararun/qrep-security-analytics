import { Routes, Route, Navigate } from 'react-router-dom'
import TearsheetPage from '@/pages/TearsheetPage'
import CompareBlocksPage from '@/pages/CompareBlocksPage'
import MetricsPage from '@/pages/MetricsPage'
import SearchTestPage from '@/pages/SearchTestPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CompareBlocksPage />} />
      <Route path="/compare-blocks" element={<CompareBlocksPage />} />
      <Route path="/tearsheet" element={<TearsheetPage />} />
      <Route path="/metrics" element={<MetricsPage />} />
      <Route path="/search" element={<SearchTestPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
