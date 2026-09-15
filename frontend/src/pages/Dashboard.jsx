import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, deleteProject } from '../services/api'
import { supabase } from '../lib/supabase'

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
      setName('')
      setDescription('')
      setError('')
      fetchProjects()
    } catch {
      setError('Failed to create project.')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project and all its data?')) return
    try {
      await deleteProject(id)
      fetchProjects()
    } catch {
      setError('Failed to delete project.')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    // AuthGuard handles the redirect automatically
  }

  return (
    <div style={s.shell}>
      {/* full-bleed sticky header, same pattern as Landing's nav */}
      <header style={s.topbar}>
        <div style={s.topbarInner}>
          <div style={s.logoRow}>
            <div style={s.logoMark}>CB</div>
            <span style={s.logoText}>ContextBridge</span>
          </div>
          <button onClick={handleSignOut} style={s.signOutBtn}>Sign Out</button>
        </div>
      </header>

      {/* centered content column — width is self-contained, doesn't depend on ancestors */}
      <main style={s.page}>
        <p style={s.sub}>Persistent project memory for AI coding agents</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleCreate} style={s.form}>
          <h2 style={s.sectionTitle}>New Project</h2>
          <div style={s.formRow}>
            <input
              style={s.input}
              placeholder="Project name *"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <input
              style={s.input}
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" style={s.btnPrimary}>+ Create Project</button>
        </form>

        <h2 style={s.sectionTitle}>Projects</h2>

        {loading && <p style={s.muted}>Loading...</p>}
        {!loading && projects.length === 0 && (
          <p style={s.muted}>No projects yet. Create one above.</p>
        )}

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
                <button style={s.btnPrimary} onClick={() => navigate(`/projects/${p.id}`)}>
                  Open Workspace
                </button>
                <button style={s.btnDanger} onClick={() => handleDelete(p.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/* ── ContextBridge ember theme ── */
const c = {
  bg: '#130d0a', bgRaised: '#1c130e', bgCard: '#201712',
  border: '#3a2a1e', borderSoft: '#241a13',
  text: '#f3ece4', textDim: '#a8998b', textFaint: '#6f6053',
  orange: '#ff7a3d', orangeHot: '#ff4d1c', orangeDim: '#7a4526',
  danger: '#f87171', dangerBg: 'rgba(248,113,113,0.10)', dangerBorder: 'rgba(248,113,113,0.25)',
}

const s = {
  shell:   { width: '100%', minHeight: '100vh', background: c.bg, color: c.text, fontFamily: "'Inter', system-ui, sans-serif" },

  topbar:      { position: 'sticky', top: 0, zIndex: 10, width: '100%', background: 'rgba(19,13,10,0.85)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${c.borderSoft}` },
  topbarInner: { maxWidth: 1120, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoRow:     { display: 'flex', alignItems: 'center', gap: '10px' },
  logoMark:    { width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${c.orange}, ${c.orangeHot})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a0d05', fontWeight: 700, fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" },
  logoText:    { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '17px', color: c.text },
  signOutBtn:  { padding: '9px 18px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: c.textDim },

  page: { width: '100%', maxWidth: 1120, margin: '0 auto', padding: '48px 32px 80px', boxSizing: 'border-box' },

  sub: { color: c.textFaint, margin: '0 0 2rem', fontSize: '0.95rem' },

  sectionTitle: { fontSize: '1.15rem', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", marginBottom: '1rem', color: c.text },

  form:    { background: c.bgCard, padding: '1.75rem', borderRadius: 14, marginBottom: '2.75rem', border: `1px solid ${c.border}` },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' },
  input:   { width: '100%', padding: '0.75rem 0.9rem', border: `1px solid ${c.border}`, borderRadius: 8, fontSize: '0.95rem', boxSizing: 'border-box', background: c.bgRaised, color: c.text, fontFamily: 'inherit' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem' },

  card:        { background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 14, padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:   { fontWeight: 600, fontSize: '1.05rem', fontFamily: "'Space Grotesk', sans-serif", margin: 0, color: c.text },
  badge:       { background: 'rgba(255,122,61,0.12)', color: c.orange, padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", border: `1px solid ${c.orangeDim}` },
  cardDesc:    { color: c.textDim, fontSize: '0.9rem', margin: 0, flexGrow: 1 },
  cardDate:    { color: c.textFaint, fontSize: '0.78rem', margin: 0, fontFamily: "'IBM Plex Mono', monospace" },
  cardActions: { display: 'flex', gap: '0.6rem', marginTop: '0.7rem' },

  btnPrimary: { padding: '0.6rem 1.2rem', background: `linear-gradient(135deg, ${c.orange}, ${c.orangeHot})`, color: '#1a0d05', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 },
  btnDanger:  { padding: '0.6rem 1.2rem', background: c.dangerBg, color: c.danger, border: `1px solid ${c.dangerBorder}`, borderRadius: 9, cursor: 'pointer', fontSize: '0.9rem' },

  error: { background: c.dangerBg, color: c.danger, padding: '0.8rem 1.1rem', borderRadius: 9, marginBottom: '1.25rem', border: `1px solid ${c.dangerBorder}` },
  muted: { color: c.textFaint },
}