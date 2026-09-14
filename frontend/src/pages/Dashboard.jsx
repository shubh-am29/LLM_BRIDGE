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
      await createProject({
        name: name.trim(),
        description: description.trim()
      })
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
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerRow}>
          <div style={s.logoRow}>
            <div style={s.logoMark}>CB</div>
            <h1 style={s.title}>ContextBridge</h1>
          </div>

          <button onClick={handleSignOut} style={s.signOutBtn}>
            Sign Out
          </button>
        </div>

        <p style={s.sub}>
          Persistent project memory for AI coding agents
        </p>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <form onSubmit={handleCreate} style={s.form}>
        <h2 style={s.sectionTitle}>New Project</h2>

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

        <button type="submit" style={s.btnPrimary}>
          + Create Project
        </button>
      </form>

      <h2 style={s.sectionTitle}>Projects</h2>

      {loading && <p style={s.muted}>Loading...</p>}

      {!loading && projects.length === 0 && (
        <p style={s.muted}>
          No projects yet. Create one above.
        </p>
      )}

      <div style={s.grid}>
        {projects.map(p => (
          <div key={p.id} style={s.card}>
            <div style={s.cardTop}>
              <h3 style={s.cardTitle}>{p.name}</h3>
              <span style={s.badge}>
                v{p.version || 1}
              </span>
            </div>

            <p style={s.cardDesc}>
              {p.description || 'No description'}
            </p>

            <p style={s.cardDate}>
              Created {new Date(p.created_at).toLocaleDateString()}
            </p>

            <div style={s.cardActions}>
              <button
                style={s.btnPrimary}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                Open Workspace
              </button>

              <button
                style={s.btnDanger}
                onClick={() => handleDelete(p.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── ContextBridge ember theme ── */
const c = {
  bg:        '#130d0a',
  bgRaised:  '#1c130e',
  bgCard:    '#201712',
  border:    '#3a2a1e',
  borderSoft:'#241a13',
  text:      '#f3ece4',
  textDim:   '#a8998b',
  textFaint: '#6f6053',
  orange:    '#ff7a3d',
  orangeHot: '#ff4d1c',
  orangeDim: '#7a4526',
  danger:    '#e0605a',
  dangerBg:  '#2a1512',
  dangerBorder: '#4a2420',
}

const s = {
  page: {
    minHeight: '100vh',
    maxWidth: 900,
    margin: '0 auto',
    padding: '2.5rem 2rem 4rem',
    fontFamily: "'Inter', system-ui, sans-serif",
    background: c.bg,
    color: c.text
  },

  header: {
    marginBottom: '2rem',
    borderBottom: `1px solid ${c.borderSoft}`,
    paddingBottom: '1.25rem'
  },

  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem'
  },

  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem'
  },

  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: `linear-gradient(135deg, ${c.orange}, ${c.orangeHot})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1a0d05',
    fontWeight: 700,
    fontSize: '0.72rem',
    fontFamily: "'IBM Plex Mono', monospace",
    flexShrink: 0
  },

  title: {
    fontSize: '1.6rem',
    fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif",
    color: c.text,
    margin: 0,
    letterSpacing: '-0.01em'
  },

  signOutBtn: {
    padding: '0.45rem 1rem',
    background: 'transparent',
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: c.textDim,
    transition: 'all .15s ease'
  },

  sub: {
    color: c.textFaint,
    margin: '0.25rem 0 0',
    fontSize: '0.92rem'
  },

  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    marginBottom: '1rem',
    color: c.text
  },

  form: {
    background: c.bgCard,
    padding: '1.5rem',
    borderRadius: 12,
    marginBottom: '2.5rem',
    border: `1px solid ${c.border}`
  },

  input: {
    display: 'block',
    width: '100%',
    padding: '0.7rem 0.85rem',
    marginBottom: '0.75rem',
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    background: c.bgRaised,
    color: c.text,
    fontFamily: 'inherit'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1rem'
  },

  card: {
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    transition: 'border-color .15s ease'
  },

  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  cardTitle: {
    fontWeight: 600,
    fontSize: '1rem',
    fontFamily: "'Space Grotesk', sans-serif",
    margin: 0,
    color: c.text
  },

  badge: {
    background: 'rgba(255,122,61,0.12)',
    color: c.orange,
    padding: '0.2rem 0.55rem',
    borderRadius: 99,
    fontSize: '0.72rem',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    border: `1px solid ${c.orangeDim}`
  },

  cardDesc: {
    color: c.textDim,
    fontSize: '0.875rem',
    margin: 0,
    flexGrow: 1
  },

  cardDate: {
    color: c.textFaint,
    fontSize: '0.78rem',
    margin: 0,
    fontFamily: "'IBM Plex Mono', monospace"
  },

  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.6rem'
  },

  btnPrimary: {
    padding: '0.55rem 1.1rem',
    background: `linear-gradient(135deg, ${c.orange}, ${c.orangeHot})`,
    color: '#1a0d05',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600
  },

  btnDanger: {
    padding: '0.55rem 1.1rem',
    background: c.dangerBg,
    color: c.danger,
    border: `1px solid ${c.dangerBorder}`,
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.875rem'
  },

  error: {
    background: c.dangerBg,
    color: c.danger,
    padding: '0.75rem 1rem',
    borderRadius: 8,
    marginBottom: '1rem',
    border: `1px solid ${c.dangerBorder}`
  },

  muted: {
    color: c.textFaint
  }
}