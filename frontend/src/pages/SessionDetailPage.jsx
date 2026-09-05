import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, processSession, getProposals } from '../services/api'

export default function SessionDetailPage() {
  const { projectId, sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [proposals, setProposals] = useState([])
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [sessRes, propRes] = await Promise.all([
        getSession(projectId, sessionId),
        getProposals(projectId)
      ])
      setSession(sessRes.data)
      setProposals((propRes.data || []).filter(p => p.session_id === sessionId))
    } catch { setError('Failed to load session.') }
    finally { setLoading(false) }
  }

  async function handleProcess() {
    setProcessing(true); setError('')
    try {
      const res = await processSession(projectId, sessionId)
      navigate(`/projects/${projectId}/proposals/${res.data.proposal_id}`)
    } catch { setError('Processing failed. Try again.') }
    finally { setProcessing(false) }
  }

  if (loading) return <div style={s.center}>Loading...</div>
  if (!session) return <div style={s.center}>Session not found.</div>

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate(`/projects/${projectId}`)}>← Back to Project</button>
      <div style={s.header}>
        <h1 style={s.title}>{session.title || 'Untitled Session'}</h1>
        <span style={session.status === 'processed' ? s.statusProcessed : s.statusImported}>{session.status}</span>
      </div>
      <div style={s.metaRow}>
        <span style={s.chip}>{session.agent_name}</span>
        <span style={s.chip}>{session.source_type}</span>
        <span style={s.chip}>{new Date(session.created_at).toLocaleString()}</span>
      </div>
      {session.notes && <p style={s.notes}><strong>Notes:</strong> {session.notes}</p>}

      {error && <div style={s.error}>{error}</div>}

      {/* Actions */}
      <div style={s.actionBar}>
        {session.status === 'imported' && (
          <button style={s.btnPrimary} onClick={handleProcess} disabled={processing}>
            {processing ? 'Extracting...' : '⚡ Extract Context & Propose Changes'}
          </button>
        )}
        {proposals.length > 0 && (
          <button style={s.btnSecondary} onClick={() => navigate(`/projects/${projectId}/proposals/${proposals[0].id}`)}>
            View Proposed Changes →
          </button>
        )}
      </div>

      {/* Extracted data */}
      {session.extracted_data && Object.keys(session.extracted_data).length > 0 && (
        <div style={s.extractedBox}>
          <h2 style={s.sectionTitle}>Extracted Context</h2>
          {Object.entries(session.extracted_data).map(([key, val]) => {
            if (!val || (Array.isArray(val) && val.length === 0)) return null
            return (
              <div key={key} style={s.extractedItem}>
                <div style={s.extractedKey}>{key.replace(/_/g, ' ')}</div>
                {Array.isArray(val)
                  ? <ul style={s.extractedList}>{val.map((v, i) => <li key={i}>{v}</li>)}</ul>
                  : <p style={s.extractedVal}>{val}</p>
                }
              </div>
            )
          })}
        </div>
      )}

      {/* Raw content */}
      <div style={s.rawBox}>
        <h2 style={s.sectionTitle}>Raw Session Content</h2>
        <pre style={s.rawPre}>{session.raw_content}</pre>
      </div>
    </div>
  )
}

const s = {
  page: { maxWidth: 860, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' },
  center: { textAlign: 'center', padding: '4rem', color: '#6b7280' },
  back: { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 },
  metaRow: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  chip: { background: '#f3f4f6', color: '#374151', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem' },
  notes: { color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' },
  actionBar: { display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  btnPrimary: { padding: '0.6rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 },
  btnSecondary: { padding: '0.6rem 1.25rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #fecaca' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' },
  extractedBox: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' },
  extractedItem: { marginBottom: '0.75rem' },
  extractedKey: { fontWeight: 600, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' },
  extractedList: { margin: 0, paddingLeft: '1.25rem', color: '#374151', fontSize: '0.875rem' },
  extractedVal: { margin: 0, color: '#374151', fontSize: '0.875rem' },
  rawBox: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' },
  rawPre: { margin: 0, fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto', maxHeight: 500, overflowY: 'auto', color: '#374151' },
  statusProcessed: { background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 },
  statusImported: { background: '#fef9c3', color: '#ca8a04', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }
}