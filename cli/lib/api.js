const axios = require('axios')

function createClient(backendUrl) {
  return axios.create({
    baseURL: backendUrl,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function fetchProjects(backendUrl) {
  const client = createClient(backendUrl)
  const res    = await client.get('/projects/')
  return res.data
}

async function fetchProject(backendUrl, projectId) {
  const client = createClient(backendUrl)
  const res    = await client.get(`/projects/${projectId}`)
  return res.data
}

async function fetchMemory(backendUrl, projectId) {
  const client = createClient(backendUrl)
  const res    = await client.get(`/projects/${projectId}/memory/`)
  return res.data
}

async function fetchHandoffPrompt(backendUrl, projectId) {
  const client = createClient(backendUrl)
  const res    = await client.get(`/projects/${projectId}/handoff/prompt`)
  return res.data
}

async function fetchExportPackage(backendUrl, projectId) {
  const client = createClient(backendUrl)
  const res    = await client.get(`/projects/${projectId}/context/export/package`)
  return res.data
}

async function fetchCompleteness(backendUrl, projectId) {
  const client = createClient(backendUrl)
  const res    = await client.get(`/projects/${projectId}/handoff/completeness`)
  return res.data
}

async function fetchSessions(backendUrl, projectId) {
  const client = createClient(backendUrl)
  const res    = await client.get(`/projects/${projectId}/sessions/`)
  return res.data
}

async function fetchVersions(backendUrl, projectId) {
  const client = createClient(backendUrl)
  const res    = await client.get(`/projects/${projectId}/memory/versions`)
  return res.data
}

async function pingBackend(backendUrl) {
  const client = createClient(backendUrl)
  const res    = await client.get('/health')
  return res.data
}

module.exports = {
  fetchProjects,
  fetchProject,
  fetchMemory,
  fetchHandoffPrompt,
  fetchExportPackage,
  fetchCompleteness,
  fetchSessions,
  fetchVersions,
  pingBackend
}