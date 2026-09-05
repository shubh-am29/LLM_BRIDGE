import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getProject, getMemory, saveMemory, getMemoryVersions, restoreVersion,
  getSessions, exportMarkdown, exportJson, exportPackage, getCompleteness
} from '../services/api'

const MEMORY_SCHEMA = [
  { key: 'project_overview',  label: 'Project Overview',   type: 'text', hint: 'What is this project, why does it exist, what problem does it solve?' },
  { key: 'requirements',      label: 'Requirements',        type: 'list', hint: 'One requirement per line' },
  { key: 'architecture',      label: 'Architecture',        type: 'text', hint: 'System architecture, major components, data flow' },
  { key: 'technologies',      label: 'Technologies',        type: 'list', hint: 'Languages, frameworks, databases, services' },
  { key: 'current_progress',  label: 'Current Progress',    type: 'list', hint: 'Completed features and tasks' },
  { key: 'key_decisions',     label: 'Key Decisions',       type: 'list', hint: 'Technical and architectural decisions made' },
  { key: 'pending_tasks',     label: 'Pending Tasks',       type: 'list', hint: 'Work still to be done' },
  { key: 'known_issues',      label: 'Known Issues',        type: 'list', hint: 'Bugs, limitations, blockers' },
  { key: 'agent_instructions',label: 'Agent Instructions',  type: 'list', hint: 'Instructions the next AI agent must follow' },
]

const TABS = ['overview', 'memory', 'sessions', 'history', 'export', 'handoff']

export default function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [project,      setProject]      = useState(null)
  const [memory,       setMemory]       = useState({})
  const [savedMemory,  setSavedMemory]  = useState({})
  const [memVersion,   setMemVersion]   = useState(1)
  const [memUpdated,   setMemUpdated]   = useState('')
  const [versions,     setVersions]     = useState([])
  const [sessions,     setSessions]     = useState([])
  const [completeness, setCompleteness] = useState(null)
  const [tab,          setTab]          = useState('overview')
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState({ type: '', text: '' })
  const [mdPreview,    setMdPreview]    = useState('')
  const [jsonPreview,  setJsonPreview]  = useState(null)
  const [exporting,    setExporting]    = useState(false)
  const [loading,      setLoading]      = useState(true)

  const isDirty = JSON.stringify(memory) !== JSON.stringify(savedMemory)

  useEffect(() => { loadAll() }, [projectId])

  useEffect(() => {
    if (!isDirty) return
    const handler = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  async function loadAll() {
    setLoading(true)
    try {
      const [projRes, memRes, versRes, sessRes, compRes] = await Promise.all([
        getProject(projectId),
        getMemory(projectId),
        getMemoryVersions(projectId),
        getSessions(projectId),
        getCompleteness(projectId)
      ])
      setProject(projRes.data)
      const md = memRes.data.memory_data || {}
      setMemory(md)
      setSavedMemory(md)
      setMemVersion(memRes.data.version)
      setMemUpdated(memRes.data.updated_at || '')
      setVersions(versRes.data || [])
      setSessions(sessRes.data || [])
      setCompleteness(compRes.data)
    } catch {
      setMsg({ type: 'error', text: 'Failed to load project data.' })
    } finally {
      setLoading(false)
    }
  }

  function handleTextChange(key, val) {
    setMemory(prev => ({ ...prev, [key]: val }))
  }

  function handleListChange(key, val) {
    setMemory(prev => ({
      ...prev,
      [key]: val.split('\n').map(s => s.trim()).filter(Boolean)
    }))
  }

  async function handleSave() {
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await saveMemory(projectId, {
        memory_data: memory,
        change_summary: 'Manual save'
      })
      const md = res.data.memory_data || {}
      setMemory(md)
      setSavedMemory(md)
      setMemVersion(res.data.version)
      setMemUpdated(res.data.updated_at || '')
      setMsg({ type: 'success', text: `Saved as version ${res.data.version}` })
      const [versRes, compRes] = await Promise.all([
        getMemoryVersions(projectId),
        getCompleteness(projectId)
      ])
      setVersions(versRes.data || [])
      setCompleteness(compRes.data)
    } catch {
      setMsg({ type: 'error', text: 'Save failed. Your changes are not lost.' })
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    if (isDirty && !confirm('Discard unsaved changes?')) return
    setMemory(savedMemory)
    setMsg({ type: '', text: '' })
  }

  async function handleRestore(version) {
    if (!confirm(`Restore version ${version}? Current memory will be snapshotted first.`)) return
    try {
      const res = await restoreVersion(projectId, version)
      const md = res.data.memory_data || {}
      setMemory(md)
      setSavedMemory(md)
      setMemVersion(res.data.version)
      setMsg({ type: 'success', text: `Restored to v${version} (now v${res.data.version})` })
      const [versRes, compRes] = await Promise.all([
        getMemoryVersions(projectId),
        getCompleteness(projectId)
      ])
      setVersions(versRes.data || [])
      setCompleteness(compRes.data)
    } catch {
      setMsg({ type: 'error', text: 'Restore failed.' })
    }
  }

  async function handleExportMd() {
    setExporting(true)
    try {
      const res = await exportMarkdown(projectId)
      setMdPreview(res.data.markdown)
    } catch {
      setMsg({ type: 'error', text: 'Export failed.' })
    } finally {
      setExporting(false)
    }
  }

  async function handleExportJson() {
    setExporting(true)
    try {
      const res = await exportJson(projectId)
      setJsonPreview(res.data)
    } catch {
      setMsg({ type: 'error', text: 'Export failed.' })
    } finally {
      setExporting(false)
    }
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadPackage() {
    setExporting(true)
    try {
      const res = await exportPackage(projectId)
      const { project_memory_md, project_memory_json, project_config_json, agent_instructions_md } = res.data
      downloadFile(project_memory_md, 'project-memory.md', 'text/markdown')
      setTimeout(() => downloadFile(JSON.stringify(project_memory_json, null, 2), 'project-memory.json', 'application/json'), 300)
      setTimeout(() => downloadFile(JSON.stringify(project_config_json, null, 2), 'project-config.json', 'application/json'), 600)
      if (agent_instructions_md) {
        setTimeout(() => downloadFile(agent_instructions_md, 'AGENT-INSTRUCTIONS.md', 'text/markdown'), 900)
      }
    } catch {
      setMsg({ type: 'error', text: 'Download failed.' })
    } finally {
      setExporting(false)
    }
  }

  function scoreColor(score) {
    if (score >= 80) return '#16a34a'
    if (score >= 50) return '#d97706'
    return '#dc2626'
  }

  function tabLabel(t) {
    const map = {
      overview: 'Overview',
      memory:   'Project Memory',
      sessions: 'Agent Sessions',
      history:  'Memory History',
      export:   'Export',
      handoff:  'Agent Handoff'
    }
    return map[t] || t
  }

  if (loading) return <div style={s.center}>Loading project...</div>
  if (!project) return <div style={s.center}>Project not found.</div>

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={s.headerBar}>
        <button
          style={s.backBtn}
          onClick={() => {
            if (isDirty && !confirm('Leave with unsaved changes?')) return
            navigate('/')
          }}
        >
          ← Dashboard
        </button>

        <div style={s.projectMeta}>
          <h1 style={s.projectTitle}>{project.name}</h1>
          {project.description && <p style={s.projectDesc}>{project.description}</p>}
          <div style={s.metaRow}>
            <span style={s.metaChip}>Memory v{memVersion}</span>
            {memUpdated && (
              <span style={s.metaChip}>
                Updated {new Date(memUpdated).toLocaleDateString()}
              </span>
            )}
            <span style={s.metaChip}>
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
            {completeness && (
              <span style={{
                ...s.metaChip,
                background: completeness.score >= 80 ? '#dcfce7' : completeness.score >= 50 ? '#fef9c3' : '#fee2e2',
                color: scoreColor(completeness.score)
              }}>
                {completeness.score}% complete
              </span>
            )}
          </div>
        </div>

        <button
          style={s.importBtn}
          onClick={() => navigate(`/projects/${projectId}/import`)}
        >
          + Import Agent Session
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t}
            style={tab === t ? s.tabActive : s.tab}
            onClick={() => setTab(t)}
          >
            {tabLabel(t)}
            {t === 'handoff' && completeness?.ready_for_handoff && (
              <span style={s.readyDot}>●</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Global message ── */}
      {msg.text && (
        <div style={msg.type === 'error' ? s.errorMsg : s.successMsg}>
          {msg.text}
          <button style={s.closeMsg} onClick={() => setMsg({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* ════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Project Overview</h2>

          <div style={s.infoGrid}>
            <div style={s.infoCard}>
              <div style={s.infoLabel}>Memory Version</div>
              <div style={s.infoVal}>v{memVersion}</div>
            </div>
            <div style={s.infoCard}>
              <div style={s.infoLabel}>Agent Sessions</div>
              <div style={s.infoVal}>{sessions.length}</div>
            </div>
            <div style={s.infoCard}>
              <div style={s.infoLabel}>Memory Versions</div>
              <div style={s.infoVal}>{versions.length}</div>
            </div>
            <div style={s.infoCard}>
              <div style={s.infoLabel}>Completeness</div>
              <div style={{ ...s.infoVal, color: completeness ? scoreColor(completeness.score) : '#111827' }}>
                {completeness ? `${completeness.score}%` : '—'}
              </div>
            </div>
          </div>

          <div style={s.quickActions}>
            <h3 style={s.subTitle}>Quick Actions</h3>
            <div style={s.btnRow}>
              <button style={s.btnPrimary} onClick={() => setTab('memory')}>Edit Memory</button>
              <button style={s.btnSecondary} onClick={() => navigate(`/projects/${projectId}/import`)}>Import Session</button>
              <button style={{ ...s.btnPrimary, background: '#059669' }} onClick={() => navigate(`/projects/${projectId}/handoff`)}>Agent Handoff</button>
              <button style={s.btnSecondary} onClick={() => setTab('export')}>Export Context</button>
            </div>
          </div>

          {memory.project_overview && (
            <div style={s.overviewBox}>
              <h3 style={s.subTitle}>Project Description</h3>
              <p style={s.overviewText}>{memory.project_overview}</p>
            </div>
          )}

          {memory.pending_tasks?.length > 0 && (
            <div style={s.overviewBox}>
              <h3 style={s.subTitle}>Pending Tasks</h3>
              <ul style={s.simpleList}>
                {memory.pending_tasks.map((t, i) => <li key={i}>☐ {t}</li>)}
              </ul>
            </div>
          )}

          {memory.agent_instructions?.length > 0 && (
            <div style={s.instructionsBox}>
              <h3 style={s.subTitle}>⚡ Agent Instructions</h3>
              <ul style={s.instrList}>
                {memory.agent_instructions.map((inst, i) => <li key={i}>{inst}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          MEMORY TAB
      ════════════════════════════════ */}
      {tab === 'memory' && (
        <div style={s.section}>
          <div style={s.memHeader}>
            <div>
              <h2 style={s.sectionTitle}>Project Memory</h2>
              {isDirty && <span style={s.dirtyBadge}>● Unsaved changes</span>}
            </div>
            <div style={s.btnRow}>
              {isDirty && (
                <button style={s.btnSecondary} onClick={handleDiscard}>Discard</button>
              )}
              <button
                style={s.btnPrimary}
                onClick={handleSave}
                disabled={saving || !isDirty}
              >
                {saving ? 'Saving...' : 'Save Memory'}
              </button>
            </div>
          </div>

          {MEMORY_SCHEMA.map(field => (
            <div key={field.key} style={s.memBlock}>
              <label style={s.memLabel}>{field.label}</label>
              <p style={s.memHint}>{field.hint}</p>
              <textarea
                style={s.memTextarea}
                value={
                  field.type === 'text'
                    ? (memory[field.key] || '')
                    : (Array.isArray(memory[field.key]) ? memory[field.key].join('\n') : '')
                }
                onChange={e =>
                  field.type === 'text'
                    ? handleTextChange(field.key, e.target.value)
                    : handleListChange(field.key, e.target.value)
                }
                placeholder={field.type === 'text' ? `Enter ${field.label.toLowerCase()}...` : 'One item per line...'}
                rows={4}
              />
            </div>
          ))}

          <div style={s.btnRow}>
            {isDirty && (
              <button style={s.btnSecondary} onClick={handleDiscard}>Discard</button>
            )}
            <button
              style={s.btnPrimary}
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? 'Saving...' : 'Save Memory'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          SESSIONS TAB
      ════════════════════════════════ */}
      {tab === 'sessions' && (
        <div style={s.section}>
          <div style={s.memHeader}>
            <h2 style={s.sectionTitle}>Agent Sessions</h2>
            <button
              style={s.btnPrimary}
              onClick={() => navigate(`/projects/${projectId}/import`)}
            >
              + Import Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div style={s.emptyState}>
              <p style={s.emptyTitle}>No agent sessions yet</p>
              <p style={s.emptyDesc}>Import a session to extract project context automatically.</p>
              <button
                style={s.btnPrimary}
                onClick={() => navigate(`/projects/${projectId}/import`)}
              >
                Import Agent Session
              </button>
            </div>
          ) : (
            <div style={s.sessionList}>
              {sessions.map(sess => (
                <div key={sess.id} style={s.sessionCard}>
                  <div style={s.sessionTop}>
                    <div>
                      <div style={s.sessionTitle}>{sess.title || 'Untitled Session'}</div>
                      <div style={s.sessionMeta}>
                        {sess.agent_name} · {sess.source_type} · {new Date(sess.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={sess.status === 'processed' ? s.statusProcessed : s.statusImported}>
                      {sess.status}
                    </span>
                  </div>
                  {sess.summary && (
                    <p style={s.sessionSummary}>{sess.summary.slice(0, 150)}...</p>
                  )}
                  <div style={s.btnRow}>
                    <button
                      style={s.btnSecondary}
                      onClick={() => navigate(`/projects/${projectId}/sessions/${sess.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          HISTORY TAB
      ════════════════════════════════ */}
      {tab === 'history' && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Memory History</h2>

          {versions.length === 0 ? (
            <p style={s.muted}>No version history yet. Save memory to create the first version.</p>
          ) : (
            <div style={s.versionList}>
              {versions.map(v => (
                <div key={v.id} style={s.versionCard}>
                  <div style={s.versionTop}>
                    <span style={s.versionBadge}>v{v.version}</span>
                    <span style={s.versionDate}>{new Date(v.created_at).toLocaleString()}</span>
                    <button style={s.btnSmall} onClick={() => handleRestore(v.version)}>
                      Restore
                    </button>
                  </div>
                  {v.change_summary && (
                    <p style={s.changeSummary}>{v.change_summary}</p>
                  )}
                  <details style={s.details}>
                    <summary style={s.detailsSummary}>View snapshot</summary>
                    <pre style={s.snapshotPre}>{JSON.stringify(v.memory_data, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          EXPORT TAB
      ════════════════════════════════ */}
      {tab === 'export' && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Export Agent-Readable Context</h2>
          <p style={s.exportDesc}>
            Export your project memory as portable files that any AI coding agent can read.
          </p>

          <div style={s.exportGrid}>
            {/* Markdown */}
            <div style={s.exportCard}>
              <h3 style={s.exportCardTitle}>📄 Markdown</h3>
              <p style={s.exportCardDesc}>
                Human and agent readable. Paste at the start of any AI session.
              </p>
              <div style={s.btnRow}>
                <button style={s.btnSecondary} onClick={handleExportMd} disabled={exporting}>
                  Preview
                </button>
                {mdPreview && (
                  <>
                    <button
                      style={s.btnPrimary}
                      onClick={() => downloadFile(mdPreview, 'project-memory.md', 'text/markdown')}
                    >
                      Download
                    </button>
                    <button
                      style={s.btnSecondary}
                      onClick={() => {
                        navigator.clipboard.writeText(mdPreview)
                        setMsg({ type: 'success', text: 'Copied to clipboard!' })
                      }}
                    >
                      Copy
                    </button>
                  </>
                )}
              </div>
              {mdPreview && (
                <div style={s.previewBox}>
                  <pre style={s.previewPre}>{mdPreview}</pre>
                </div>
              )}
            </div>

            {/* JSON */}
            <div style={s.exportCard}>
              <h3 style={s.exportCardTitle}>🗂 JSON</h3>
              <p style={s.exportCardDesc}>
                Structured memory for tools, scripts, and future integrations.
              </p>
              <div style={s.btnRow}>
                <button style={s.btnSecondary} onClick={handleExportJson} disabled={exporting}>
                  Preview
                </button>
                {jsonPreview && (
                  <button
                    style={s.btnPrimary}
                    onClick={() => downloadFile(JSON.stringify(jsonPreview, null, 2), 'project-memory.json', 'application/json')}
                  >
                    Download
                  </button>
                )}
              </div>
              {jsonPreview && (
                <div style={s.previewBox}>
                  <pre style={s.previewPre}>{JSON.stringify(jsonPreview, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Package download */}
          <div style={s.packageBox}>
            <h3 style={s.exportCardTitle}>📦 Complete .contextbridge Package</h3>
            <p style={s.exportCardDesc}>
              Downloads 4 files: project-memory.md, project-memory.json,
              project-config.json, AGENT-INSTRUCTIONS.md
            </p>
            <button
              style={s.btnPrimary}
              onClick={handleDownloadPackage}
              disabled={exporting}
            >
              {exporting ? 'Preparing...' : 'Download Package (4 files)'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          HANDOFF TAB
      ════════════════════════════════ */}
      {tab === 'handoff' && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Agent Handoff</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Generate ready-to-use context that the next AI coding agent can consume directly.
          </p>

          {/* Memory indicators */}
          {completeness && (
            <div style={h.indicatorRow}>
              <div style={h.indicator}>
                <div style={h.indicatorLabel}>Memory Completeness</div>
                <div style={h.indicatorBar}>
                  <div style={{
                    ...h.indicatorFill,
                    width: `${completeness.score}%`,
                    background: scoreColor(completeness.score)
                  }} />
                </div>
                <div style={h.indicatorVal}>
                  {completeness.score}% — {completeness.filled}/{completeness.total} sections filled
                </div>
              </div>

              <div style={h.indicator}>
                <div style={h.indicatorLabel}>Handoff Status</div>
                <div style={{
                  ...h.statusBadge,
                  background: completeness.ready_for_handoff ? '#dcfce7' : '#fef9c3',
                  color: completeness.ready_for_handoff ? '#16a34a' : '#92400e'
                }}>
                  {completeness.ready_for_handoff
                    ? '✓ Ready for Agent Handoff'
                    : '⚠ Needs more information'}
                </div>
              </div>

              <div style={h.indicator}>
                <div style={h.indicatorLabel}>Agent Sessions</div>
                <div style={h.indicatorNum}>{sessions.length}</div>
              </div>
            </div>
          )}

          {/* Missing fields */}
          {completeness?.missing?.length > 0 && (
            <div style={h.missingBox}>
              <span><strong>Missing: </strong>{completeness.missing.join(', ')}</span>
              <button style={h.fillBtn} onClick={() => setTab('memory')}>Fill Now →</button>
            </div>
          )}

          {/* Warnings */}
          {completeness?.warnings?.map((w, i) => (
            <div key={i} style={h.warningRow}>⚠️ {w}</div>
          ))}

          {/* Open handoff page */}
          <div style={h.handoffCard}>
            <h3 style={h.handoffTitle}>Generate Agent Handoff Context</h3>
            <p style={h.handoffDesc}>
              Opens the full handoff builder where you can generate a complete prompt,
              select a specific task, copy context, and download the handoff file.
            </p>
            <div style={s.btnRow}>
              <button
                style={{ ...s.btnPrimary, background: '#059669' }}
                onClick={() => navigate(`/projects/${projectId}/handoff`)}
              >
                Open Agent Handoff →
              </button>
              <button style={s.btnSecondary} onClick={() => setTab('export')}>
                Export Files
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/* ─── Styles ─── */
const s = {
  page:            { maxWidth: 960, margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' },
  center:          { textAlign: 'center', padding: '4rem', color: '#6b7280' },
  headerBar:       { display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e5e7eb' },
  backBtn:         { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.9rem', padding: '0.25rem 0', whiteSpace: 'nowrap' },
  projectMeta:     { flex: 1 },
  projectTitle:    { fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem' },
  projectDesc:     { color: '#6b7280', margin: '0 0 0.5rem', fontSize: '0.9rem' },
  metaRow:         { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  metaChip:        { background: '#f3f4f6', color: '#374151', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 500 },
  importBtn:       { padding: '0.6rem 1rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' },
  tabBar:          { display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' },
  tab:             { padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 },
  tabActive:       { padding: '0.6rem 1rem', background: 'none', border: 'none', borderBottom: '2px solid #4f46e5', cursor: 'pointer', fontSize: '0.875rem', color: '#4f46e5', fontWeight: 700 },
  readyDot:        { color: '#16a34a', marginLeft: '0.35rem', fontSize: '0.6rem' },
  section:         { background: '#fff' },
  sectionTitle:    { fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '1rem', marginTop: 0 },
  subTitle:        { fontSize: '1rem', fontWeight: 600, color: '#374151', margin: '1rem 0 0.5rem' },
  errorMsg:        { background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  successMsg:      { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeMsg:        { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit' },
  memHeader:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  dirtyBadge:      { color: '#d97706', fontSize: '0.8rem', fontWeight: 600 },
  memBlock:        { marginBottom: '1.5rem' },
  memLabel:        { display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' },
  memHint:         { color: '#9ca3af', fontSize: '0.8rem', margin: '0 0 0.5rem' },
  memTextarea:     { width: '100%', padding: '0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' },
  btnRow:          { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  btnPrimary:      { padding: '0.55rem 1.1rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
  btnSecondary:    { padding: '0.55rem 1.1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' },
  btnSmall:        { padding: '0.3rem 0.75rem', background: '#ede9fe', color: '#6d28d9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' },
  infoGrid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' },
  infoCard:        { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem' },
  infoLabel:       { color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.25rem' },
  infoVal:         { fontWeight: 700, color: '#111827', fontSize: '1.1rem' },
  quickActions:    { marginBottom: '1.5rem' },
  overviewBox:     { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' },
  overviewText:    { color: '#374151', margin: 0, lineHeight: 1.6 },
  simpleList:      { margin: 0, paddingLeft: '1.25rem', color: '#374151', fontSize: '0.875rem' },
  instructionsBox: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '1rem' },
  instrList:       { margin: 0, paddingLeft: '1.25rem', color: '#9a3412' },
  emptyState:      { textAlign: 'center', padding: '3rem', background: '#f9fafb', borderRadius: 10, border: '1px dashed #d1d5db' },
  emptyTitle:      { fontWeight: 700, fontSize: '1rem', color: '#374151', margin: '0 0 0.5rem' },
  emptyDesc:       { color: '#9ca3af', margin: '0 0 1rem' },
  sessionList:     { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  sessionCard:     { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', background: '#fff' },
  sessionTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' },
  sessionTitle:    { fontWeight: 700, color: '#111827', fontSize: '0.95rem' },
  sessionMeta:     { color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.2rem' },
  sessionSummary:  { color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.75rem' },
  statusProcessed: { background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 },
  statusImported:  { background: '#fef9c3', color: '#ca8a04', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 },
  versionList:     { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  versionCard:     { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' },
  versionTop:      { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' },
  versionBadge:    { background: '#ede9fe', color: '#6d28d9', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700 },
  versionDate:     { color: '#9ca3af', fontSize: '0.8rem', flex: 1 },
  changeSummary:   { color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.5rem' },
  details:         { marginTop: '0.5rem' },
  detailsSummary:  { cursor: 'pointer', color: '#4f46e5', fontSize: '0.8rem' },
  snapshotPre:     { background: '#f9fafb', padding: '0.75rem', borderRadius: 6, fontSize: '0.75rem', overflowX: 'auto', maxHeight: 300, overflowY: 'auto' },
  exportDesc:      { color: '#6b7280', marginBottom: '1.5rem' },
  exportGrid:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  exportCard:      { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' },
  exportCardTitle: { fontWeight: 700, fontSize: '1rem', margin: '0 0 0.5rem', color: '#111827' },
  exportCardDesc:  { color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' },
  packageBox:      { border: '2px solid #4f46e5', borderRadius: 8, padding: '1.25rem', background: '#f5f3ff' },
  previewBox:      { marginTop: '1rem', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' },
  previewPre:      { margin: 0, padding: '0.75rem', fontSize: '0.75rem', overflowX: 'auto', maxHeight: 300, overflowY: 'auto', background: '#f9fafb' },
  muted:           { color: '#9ca3af' },
}

const h = {
  indicatorRow:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' },
  indicator:      { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' },
  indicatorLabel: { fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' },
  indicatorBar:   { height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginBottom: '0.4rem' },
  indicatorFill:  { height: '100%', borderRadius: 99, transition: 'width 0.3s' },
  indicatorVal:   { fontSize: '0.8rem', color: '#374151' },
  statusBadge:    { padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, display: 'inline-block' },
  indicatorNum:   { fontSize: '1.5rem', fontWeight: 800, color: '#111827' },
  missingBox:     { background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#78350f', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  fillBtn:        { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 },
  warningRow:     { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '0.6rem 1rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#9a3412' },
  handoffCard:    { background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 10, padding: '1.5rem', marginTop: '1rem' },
  handoffTitle:   { fontWeight: 700, fontSize: '1rem', color: '#111827', margin: '0 0 0.5rem' },
  handoffDesc:    { color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' },
}