import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { importSession, processSession } from '../services/api'

export default function ImportSessionPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [step, setStep] = useState(1) // 1=form, 2=preview, 3=done
  const [agentName, setAgentName] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState('pasted')
  const [rawContent, setRawContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [savedSession, setSavedSession] = useState(null)
  const [error, setError] = useState('')

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    const typeMap = { txt: 'txt', md: 'md', json: 'json' }
    setSourceType(typeMap[ext] || 'txt')
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = (ev) => setRawContent(ev.target.result)
    reader.readAsText(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rawContent.trim()) { setError('Please paste or upload session content.'); return }
    setStep(2)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const res = await importSession(projectId, {
        agent_name: agentName || 'Unknown',
        title: title || 'Untitled Session',
        notes,
        raw_content: rawContent,
        source_type: sourceType
      })
      setSavedSession(res.data)
      setStep(3)
    } catch { setError('Failed to save session.') }
    finally { setSaving(false) }
  }

  async function handleProcess() {
    if (!savedSession) return
    setProcessing(true); setError('')
    try {
      await processSession(projectId, savedSession.id)
      navigate(`/projects/${projectId}/sessions/${savedSession.id}`)
    } catch { setError('Processing failed.') }
    finally { setProcessing(false) }
  }

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate(`/projects/${projectId}`)}>← Back to Project</button>
      <h1 style={s.title}>Import Agent Session</h1>
      <p style={s.sub}>Import a session from Claude Code, Codex, or any AI coding agent.</p>

      {error && <div style={s.error}>{error}</div>}

      {step === 1 && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Agent Name</label>
              <input style={s.input} placeholder="e.g. Claude Code, Codex, Cursor" value={agentName} onChange={e => setAgentName(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Session Title</label>
              <input style={s.input} placeholder="e.g. Auth implementation session" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
          </div>

          <label style={s.label}>Notes (optional)</label>
          <input style={s.input} placeholder="Any context about this session" value={notes} onChange={e => setNotes(e.target.value)} />

          <div style={s.uploadSection}>
            <label style={s.label}>Upload File (TXT, MD, JSON)</label>
            <input ref={fileRef} type="file" accept=".txt,.md,.json" onChange={handleFileUpload} style={s.fileInput} />
            <button type="button" style={s.btnSecondary} onClick={() => fileRef.current.click()}>Choose File</button>
            <span style={s.orText}>or paste below</span>
          </div>

          <label style={s.label}>Session Content *</label>
          <textarea
            style={s.textarea}
            placeholder="Paste your agent session here — the full conversation, output, or log..."
            value={rawContent}
            onChange={e => setRawContent(e.target.value)}
            rows={14}
          />
          <p style={s.tokenHint}>{rawContent.length} characters</p>

          <button type="submit" style={s.btnPrimary}>Preview & Continue →</button>
        </form>
      )}

      {step === 2 && (
        <div>
          <div style={s.previewBox}>
            <h2 style={s.previewTitle}>Session Preview</h2>
            <div style={s.previewMeta}>
              <span style={s.chip}>{agentName || 'Unknown agent'}</span>
              <span style={s.chip}>{title || 'Untitled'}</span>
              <span style={s.chip}>{sourceType}</span>
              <span style={s.chip}>{rawContent.length} characters</span>
            </div>
            <pre style={s.previewContent}>{rawContent.slice(0, 800)}{rawContent.length > 800 ? '\n\n... (truncated for preview)' : ''}</pre>
          </div>
          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={() => setStep(1)}>← Edit</button>
            <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={s.successBox}>
          <div style={s.successIcon}>✓</div>
          <h2 style={s.successTitle}>Session Saved</h2>
          <p style={s.successDesc}>The session has been stored. You can now extract project context from it.</p>
          <div style={s.btnRow}>
            <button style={s.btnPrimary} onClick={handleProcess} disabled={processing}>
              {processing ? 'Extracting Context...' : '⚡ Extract Context & Generate Changes'}
            </button>
            <button style={s.btnSecondary} onClick={() => navigate(`/projects/${projectId}`)}>Skip for Now</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 780, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' },
  back: { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 },
  title: { fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' },
  sub: { color: '#6b7280', marginBottom: '1.5rem' },
  form: { background: '#f9fafb', padding: '1.5rem', borderRadius: 10, border: '1px solid #e5e7eb' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0' },
  label: { display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.35rem', marginTop: '0.75rem' },
  input: { display: 'block', width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' },
  uploadSection: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', marginBottom: '0.25rem' },
  fileInput: { display: 'none' },
  orText: { color: '#9ca3af', fontSize: '0.875rem' },
  textarea: { display: 'block', width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'monospace', resize: 'vertical', marginTop: '0.35rem' },
  tokenHint: { color: '#9ca3af', fontSize: '0.8rem', margin: '0.25rem 0 1rem' },
  btnPrimary: { padding: '0.6rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 },
  btnSecondary: { padding: '0.6rem 1.25rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem' },
  btnRow: { display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #fecaca' },
  previewBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem', marginBottom: '1rem' },
  previewTitle: { fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', marginTop: 0 },
  previewMeta: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' },
  chip: { background: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 },
  previewContent: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.75rem', fontSize: '0.8rem', overflowX: 'auto', maxHeight: 300, overflowY: 'auto', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' },
  successBox: { textAlign: 'center', padding: '3rem', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' },
  successIcon: { fontSize: '3rem', color: '#16a34a', marginBottom: '0.5rem' },
  successTitle: { fontWeight: 800, fontSize: '1.5rem', color: '#111827', margin: '0 0 0.5rem' },
  successDesc: { color: '#6b7280', margin: '0 0 1.5rem' }
}