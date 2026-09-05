import axios from 'axios'

const api = axios.create({ baseURL: 'http://127.0.0.1:8000' })

// Projects
export const getProjects = () => api.get('/projects/')
export const getProject = (id) => api.get(`/projects/${id}`)
export const createProject = (data) => api.post('/projects/', data)
export const updateProject = (id, data) => api.patch(`/projects/${id}`, data)
export const deleteProject = (id) => api.delete(`/projects/${id}`)

// Memory
export const getMemory = (projectId) => api.get(`/projects/${projectId}/memory/`)
export const saveMemory = (projectId, data) => api.put(`/projects/${projectId}/memory/`, data)
export const getMemoryVersions = (projectId) => api.get(`/projects/${projectId}/memory/versions`)
export const restoreVersion = (projectId, version) => api.post(`/projects/${projectId}/memory/versions/${version}/restore`)

// Sessions
export const getSessions = (projectId) => api.get(`/projects/${projectId}/sessions/`)
export const getSession = (projectId, sessionId) => api.get(`/projects/${projectId}/sessions/${sessionId}`)
export const importSession = (projectId, data) => api.post(`/projects/${projectId}/sessions/`, data)
export const processSession = (projectId, sessionId) => api.post(`/projects/${projectId}/sessions/${sessionId}/process`)

// Proposals
export const getProposals = (projectId) => api.get(`/projects/${projectId}/proposals/`)
export const getProposal = (projectId, proposalId) => api.get(`/projects/${projectId}/proposals/${proposalId}`)
export const approveProposal = (projectId, proposalId, data) => api.post(`/projects/${projectId}/proposals/${proposalId}/approve`, data)
export const rejectProposal = (projectId, proposalId) => api.post(`/projects/${projectId}/proposals/${proposalId}/reject`)

// Export
export const exportMarkdown = (projectId) => api.get(`/projects/${projectId}/context/export/markdown`)
export const exportJson = (projectId) => api.get(`/projects/${projectId}/context/export/json`)
export const exportPackage = (projectId) => api.get(`/projects/${projectId}/context/export/package`)

// Handoff
export const getHandoffPrompt = (projectId) => api.get(`/projects/${projectId}/handoff/prompt`)
export const getTaskPrompt = (projectId, task) => api.post(`/projects/${projectId}/handoff/task-prompt`, { task })
export const getCompleteness = (projectId) => api.get(`/projects/${projectId}/handoff/completeness`)

// Export package (already exists but update call below uses it)
export const exportPackageFull = (projectId) => api.get(`/projects/${projectId}/context/export/package`)