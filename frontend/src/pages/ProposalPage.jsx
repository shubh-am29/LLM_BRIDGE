import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProposal, approveProposal, rejectProposal } from '../services/api'

export default function ProposalPage() {
  const { projectId, proposalId } = useParams()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState(null)
  const [editedMemory, setEditedMemory] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadProposal() }, [])

  async function loadProposal() {
    try {
      const res = await getProposal(projectId, proposalId)
      setProposal(res.data)
      setEditedMemory(res.data.proposed_memory)
    } catch { setError('Failed to load proposal.') }
    finally { setLoading(false) }
  }

  async function handleApprove() {
    setSaving(true); setError('')
    try {
      await approveProposal(projectId, proposalId, { memory_data: editedMemory })
      navigate(`/projects/${projectId}?tab=history`)
    } catch { setError('Approval failed.') }
    finally { setSaving(false) }
  }

  async function handleReject() {
    if (!confirm('Reject these proposed changes?')) return
    try {
      await rejectProposal(projectId, proposalId)
      navigate(`/projects/${projectId}`)
    } catch { setError('Rejection failed.') }
  }

  function handleMemoryEdit(key, val, type) {
    setEditedMemory(prev => ({
      ...prev,
      [key]: type === 'list' ? val.split('\n').map(s => s.trim()).filter(Boolean) : val
    }))
  }

  if (loading) return <div style={s.center}>Loading proposal...</div>
  if (!proposal) return <div style={s.center}>Proposal not found.</div>

  const diff = proposal.diff_summary || {}
  const hasDiff = Object.keys(diff).length > 0
  const listFields = ['requirements', 'technologies', 'current_progress', 'key_decisions', 'pending_tasks', 'known_issues', 'agent_instructions']
  const textFields = ['project_overview', 'architecture']

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate(`/projects/${projectId}`)}>← Back to Project</button>
      <h1 style={s.title}>Proposed Memory Changes</h1>
      <p style={s.sub}>Review the changes extracted from the agent session. Approve, edit, or reject.</p>

      {error && <div style={s.error}>{error}</div>}

      {proposal.status !== 'pending' && (
        <div style={proposal.status === 'approved' ? s.approvedBanner : s.rejectedBanner}>
          This proposal was {proposal.status}.
        </div>
      )}

      {/* Diff Summary */}
      {hasDiff && (
        <div style={s.diffBox}>
          <h2 style={s.sectionTitle}>Proposed Changes</h2>
          {Object.entries(diff).map(([field, changes]) => (
            <div key={field} style={s.diffField}>
              <div style={s.diffFieldName}>{field.replace(/_/g, ' ')}</div>
              {changes.added?.map((item, i) => (
                <div key={i} style={s.diffAdded}>+ {item}</div>
              ))}
              {changes.proposed && (
                <div style={s.diffProposed}>→ {changes.proposed}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasDiff && (
        <div style={s.noDiff}>No new information was extracted from this session.</div>
      )}

      {/* Editable proposed memory */}
      {proposal.status === 'pending' && (
        <div style={s.memBox}>
          <div style={s.memHeader}>
            <h2 style={s.sectionTitle}>Proposed Memory</h2>
            <button style={s.btnSecondary} onClick={() => setEditing(!editing)}>
              {editing ? 'Done Editing' : 'Edit Changes'}
            </button>
          </div>

          {[...textFields, ...listFields].map(key => {
            const val = editedMemory?.[key]
            const isEmpty = !val || (Array.isArray(val) && val.length === 0)
            if (!editing && isEmpty) return null
            const isText = textFields.includes(key)
            return (
              <div key={key} style={s.memField}>
                <label style={s.memLabel}>{key.replace(/_/g, ' ')}</label>
                {editing ? (
                  <textarea
                    style={s.memTextarea}
                    value={isText ? (val || '') : (Array.isArray(val) ? val.join('\n') : '')}
                    onChange={e => handleMemoryEdit(key, e.target.value, isText ? 'text' : 'list')}
                    rows={3}
                  />
                ) : (
                  isText
                    ? <p style={s.memVal}>{val}</p>
                    : <ul style={s.memList}>{(val || []).map((v, i) => <li key={i}>{v}</li>)}</ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      {proposal.status === 'pending' && (
        <div style={s.actions}>
          <button style={s.btnApprove} onClick={handleApprove} disabled={saving}>
            {saving ? 'Saving...' : '✓ Approve & Save to Memory'}
          </button>
          <button style={s.btnReject} onClick={handleReject}>✗ Reject Changes</button>
          <button style={s.btnSecondary} onClick={() => navigate(`/projects/${projectId}`)}>Cancel</button>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 860, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' },
  center: { textAlign: 'center', padding: '4rem', color: '#6b7280' },
  back: { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' },
  sub: { color: '#6b7280', marginBottom: '1.5rem' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #fecaca' },
  approvedBanner: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #bbf7d0', fontWeight: 600 },
  rejectedBanner: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #fecaca', fontWeight: 600 },
  diffBox: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', background: '#f9fafb' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem', marginTop: 0 },
  diffField: { marginBottom: '0.75rem' },
  diffFieldName: { fontWeight: 600, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' },
  diffAdded: { color: '#16a34a', fontSize: '0.875rem', paddingLeft: '0.5rem', borderLeft: '2px solid #16a34a', marginBottom: '0.2rem' },
  diffProposed: { color: '#2563eb', fontSize: '0.875rem', paddingLeft: '0.5rem', borderLeft: '2px solid #2563eb' },
  noDiff: { background: '#fef9c3', color: '#92400e', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem' },
  memBox: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' },
  memHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  memField: { marginBottom: '1rem' },
  memLabel: { display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' },
  memVal: { margin: 0, color: '#374151', fontSize: '0.875rem' },
  memList: { margin: 0, paddingLeft: '1.25rem', color: '#374151', fontSize: '0.875rem' },
  memTextarea: { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
  actions: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  btnApprove: { padding: '0.65rem 1.5rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700 },
  btnReject: { padding: '0.65rem 1.25rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 },
  btnPrimary: { padding: '0.65rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 },
  btnSecondary: { padding: '0.55rem 1.1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }
}