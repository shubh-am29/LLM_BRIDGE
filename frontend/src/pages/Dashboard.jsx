import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, deleteProject } from '../services/api'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const res = await getProjects()
      setProjects(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('Could not load projects. Is the backend running?')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createProject({ name: name.trim(), description: description.trim() })
      setName(''); setDescription(''); setError('')
      fetchProjects()
    } catch { setError('Failed to create project.') }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project and all its data?')) return
    try { await deleteProject(id); fetchProjects() }
    catch { setError('Failed to delete project.') }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>ContextBridge</h1>
        <p style={s.sub}>Persistent project memory for AI coding agents</p>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <form onSubmit={handleCreate} style={s.form}>
        <h2 style={s.sectionTitle}>New Project</h2>
        <input style={s.input} placeholder="Project name *" value={name} onChange={e => setName(e.target.value)} required />
        <input style={s.input} placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        <button type="submit" style={s.btnPrimary}>+ Create Project</button>
      </form>

      <h2 style={s.sectionTitle}>Projects</h2>
      {loading && <p style={s.muted}>Loading...</p>}
      {!loading && projects.length === 0 && <p style={s.muted}>No projects yet. Create one above.</p>}
      <div style={s.grid}>
        {projects.map(p => (
          <div key={p.id} style={s.card}>
            <div style={s.cardTop}>
              <h3 style={s.cardTitle}>{p.name}</h3>
              <span style={s.badge}>v{p.version || 1}</span>
            </div>
            <p style={s.cardDesc}>{p.description || 'No description'}</p>
            <p style={s.cardDate}>Created {new Date(p.created_at).toLocaleDateString()}</p>
            <div style={s.cardActions}>
              <button style={s.btnPrimary} onClick={() => navigate(`/projects/${p.id}`)}>Open Workspace</button>
              <button style={s.btnDanger} onClick={() => handleDelete(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' },
  header: { marginBottom: '2rem', borderBottom: '2px solid #4f46e5', paddingBottom: '1rem' },
  title: { fontSize: '2rem', fontWeight: 800, color: '#1e1b4b', margin: 0 },
  sub: { color: '#6b7280', margin: '0.25rem 0 0' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#374151' },
  form: { background: '#f9fafb', padding: '1.5rem', borderRadius: 10, marginBottom: '2rem', border: '1px solid #e5e7eb' },
  input: { display: 'block', width: '100%', padding: '0.65rem', marginBottom: '0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: 700, fontSize: '1rem', margin: 0, color: '#111827' },
  badge: { background: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.5rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 },
  cardDesc: { color: '#6b7280', fontSize: '0.875rem', margin: 0, flexGrow: 1 },
  cardDate: { color: '#9ca3af', fontSize: '0.8rem', margin: 0 },
  cardActions: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  btnPrimary: { padding: '0.5rem 1rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
  btnDanger: { padding: '0.5rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #fecaca' },
  muted: { color: '#9ca3af' }
}