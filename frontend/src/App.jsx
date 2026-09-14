import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthGuard        from './components/AuthGuard'
import LoginPage        from './pages/LoginPage'
import Dashboard        from './pages/Dashboard'
import ProjectPage      from './pages/ProjectPage'
import ImportSessionPage from './pages/ImportSessionPage'
import SessionDetailPage from './pages/SessionDetailPage'
import ProposalPage     from './pages/ProposalPage'
import AgentHandoffPage from './pages/AgentHandoffPage'
import Landing from "./pages/Landing";
function Protected({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/"                                          element={<Landing />} />
        <Route path="/dashboard"                                 element={<Protected><Dashboard /></Protected>} />
        <Route path="/projects/:projectId"                       element={<Protected><ProjectPage /></Protected>} />
        <Route path="/projects/:projectId/import"                element={<Protected><ImportSessionPage /></Protected>} />
        <Route path="/projects/:projectId/sessions/:sessionId"   element={<Protected><SessionDetailPage /></Protected>} />
        <Route path="/projects/:projectId/proposals/:proposalId" element={<Protected><ProposalPage /></Protected>} />
        <Route path="/projects/:projectId/handoff"               element={<Protected><AgentHandoffPage /></Protected>} />
      </Routes>
    </BrowserRouter>
  )
}