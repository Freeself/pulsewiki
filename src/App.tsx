import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Wiki from './pages/Wiki'
import WikiDetail from './pages/WikiDetail'
import KnowledgeNetwork from './pages/KnowledgeNetwork'
import Questions from './pages/Questions'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/wiki" element={<Wiki />} />
      <Route path="/wiki/:id" element={<WikiDetail />} />
      <Route path="/network" element={<KnowledgeNetwork />} />
      <Route path="/questions" element={<Questions />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
