import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import ImportSessionPage from './pages/ImportSessionPage'
import SessionDetailPage from './pages/SessionDetailPage'
import ProposalPage from './pages/ProposalPage'
import AgentHandoffPage from './pages/AgentHandoffPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/projects/:projectId/import" element={<ImportSessionPage />} />
        <Route path="/projects/:projectId/sessions/:sessionId" element={<SessionDetailPage />} />
        <Route path="/projects/:projectId/proposals/:proposalId" element={<ProposalPage />} />
        <Route path="/projects/:projectId/handoff" element={<AgentHandoffPage />} />
      </Routes>
    </BrowserRouter>
  )
}