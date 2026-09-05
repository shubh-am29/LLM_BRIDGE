import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getHandoffPrompt, getTaskPrompt, getCompleteness, getMemory } from '../services/api'

export default function AgentHandoffPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [fullPrompt, setFullPrompt]       = useState('')
  const [taskPrompt, setTaskPrompt]       = useState('')
  const [tokenCount, setTokenCount]       = useState(0)
  const [taskTokens, setTaskTokens]       = useState(0)
  const [completeness, setCompleteness]   = useState(null)
  const [pendingTasks, setPendingTasks]   = useState([])
  const [selectedTask, setSelectedTask]   = useState('')
  const [customTask, setCustomTask]       = useState('')
  const [activePrompt, setActivePrompt]   = useState('full') // 'full' | 'task'
  const [loading, setLoading]             = useState(true)
  const [taskLoading, setTaskLoading]     = useState(false)
  const [copied, setCopied]               = useState(false)
  const [msg, setMsg]                     = useState('')

  useEffect(() => { loadData() }, [projectId])

  async function loadData() {
    setLoading(true)
    try {
      const [promptRes, compRes, memRes] = await Promise.all([
        getHandoffPrompt(projectId),
        getCompleteness(projectId),
        getMemory(projectId)
      ])
      setFullPrompt(promptRes.data.prompt)
      setTokenCount(promptRes.data.token_count)
      setCompleteness(compRes.data)
      setPendingTasks(memRes.data.memory_data?.pending_tasks || [])
    } catch {
      setMsg('Failed to load handoff data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateTaskPrompt() {
    const task = selectedTask || customTask.trim()
    if (!task) return
    setTaskLoading(true)
    try {
      const res = await getTaskPrompt(projectId, task)
      setTaskPrompt(res.data.prompt)
      setTaskTokens(res.data.token_count)
      setActivePrompt('task')
    } catch {
      setMsg('Failed to generate task prompt.')
    } finally {
      setTaskLoading(false)
    }
  }

  function currentPrompt() {
    return activePrompt === 'task' && taskPrompt ? taskPrompt : fullPrompt
  }

  function currentTokens() {
    return activePrompt === 'task' && taskPrompt ? taskTokens : tokenCount
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(currentPrompt())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([currentPrompt()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activePrompt === 'task' ? 'task-context.md' : 'agent-handoff.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  function scoreColor(score) {
    if (score >= 80) return '#16a34a'
    if (score >= 50) return '#d97706'
    return '#dc2626'
  }

  function scoreLabel(score) {
    if (score >= 80) return 'Ready for handoff'
    if (score >= 50) return 'Partially complete'
    return 'Needs more information'
  }

  if (loading) return <div style={s.center}>Generating handoff context...</div>

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate(`/projects/${projectId}`)}>
        ← Back to Project
      </button>

      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Agent Handoff</h1>
          <p style={s.sub}>
            Generate ready-to-use context for the next AI coding agent.
          </p>
        </div>
        <div style={s.btnRow}>
          <button style={s.btnCopy} onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy Context'}
          </button>
          <button style={s.btnDownload} onClick={handleDownload}>
            Download .md
          </button>
          <button
            style={s.btnContinue}
            onClick={() => navigate(`/projects/${projectId}/import`)}
          >
            Continue Project →
          </button>
        </div>
      </div>

      {msg && <div style={s.error}>{msg}</div>}

      <div style={s.layout}>
        {/* Left — controls */}
        <div style={s.sidebar}>

          {/* Completeness */}
          {completeness && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Memory Indicators</h2>

              <div style={s.scoreRow}>
                <div
                  style={{
                    ...s.scoreCircle,
                    borderColor: scoreColor(completeness.score)
                  }}
                >
                  <span style={{ ...s.scoreNum, color: scoreColor(completeness.score) }}>
                    {completeness.score}%
                  </span>
                </div>
                <div>
                  <div style={{ ...s.scoreLabel, color: scoreColor(completeness.score) }}>
                    {scoreLabel(completeness.score)}
                  </div>
                  <div style={s.scoreSub}>
                    {completeness.filled} / {completeness.total} sections filled
                  </div>
                </div>
              </div>

              {completeness.missing?.length > 0 && (
                <div style={s.missingBox}>
                  <div style={s.missingTitle}>Missing Information</div>
                  {completeness.missing.map((m, i) => (
                    <div key={i} style={s.missingItem}>
                      <span style={s.missingDot}>○</span> {m}
                    </div>
                  ))}
                </div>
              )}

              {completeness.warnings?.length > 0 && (
                <div style={s.warningsBox}>
                  <div style={s.warningTitle}>Warnings</div>
                  {completeness.warnings.map((w, i) => (
                    <div key={i} style={s.warningItem}>⚠️ {w}</div>
                  ))}
                </div>
              )}

              {completeness.ready_for_handoff && (
                <div style={s.readyBadge}>✓ Ready for Agent Handoff</div>
              )}

              <button
                style={s.btnFillMemory}
                onClick={() => navigate(`/projects/${projectId}?tab=memory`)}
              >
                Fill Missing Fields →
              </button>
            </div>
          )}

          {/* Prompt type selector */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Context Type</h2>
            <div style={s.promptTypes}>
              <button
                style={activePrompt === 'full' ? s.typeActive : s.typeBtn}
                onClick={() => setActivePrompt('full')}
              >
                <div style={s.typeName}>Full Handoff</div>
                <div style={s.typeDesc}>Complete project context for a new agent session</div>
              </button>
              <button
                style={activePrompt === 'task' ? s.typeActive : s.typeBtn}
                onClick={() => setActivePrompt('task')}
              >
                <div style={s.typeName}>Task-Focused</div>
                <div style={s.typeDesc}>Minimal context for a specific task only</div>
              </button>
            </div>
          </div>

          {/* Task selector */}
          {activePrompt === 'task' && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Select Task</h2>

              {pendingTasks.length > 0 && (
                <>
                  <label style={s.label}>Pending Tasks</label>
                  <select
                    style={s.select}
                    value={selectedTask}
                    onChange={e => {
                      setSelectedTask(e.target.value)
                      setCustomTask('')
                    }}
                  >
                    <option value="">— Choose a task —</option>
                    {pendingTasks.map((t, i) => (
                      <option key={i} value={t}>{t.slice(0, 60)}</option>
                    ))}
                  </select>
                  <div style={s.orDivider}>or enter custom task</div>
                </>
              )}

              <label style={s.label}>Custom Task</label>
              <textarea
                style={s.taskInput}
                placeholder="Describe the specific task for the next agent..."
                value={customTask}
                onChange={e => {
                  setCustomTask(e.target.value)
                  setSelectedTask('')
                }}
                rows={3}
              />

              <button
                style={s.btnGenerate}
                onClick={handleGenerateTaskPrompt}
                disabled={taskLoading || (!selectedTask && !customTask.trim())}
              >
                {taskLoading ? 'Generating...' : 'Generate Task Context'}
              </button>
            </div>
          )}

          {/* Token count */}
          <div style={s.tokenCard}>
            <div style={s.tokenLabel}>Context Size</div>
            <div style={s.tokenVal}>{currentTokens().toLocaleString()}</div>
            <div style={s.tokenSub}>tokens</div>
            <div style={s.tokenBar}>
              <div
                style={{
                  ...s.tokenFill,
                  width: `${Math.min((currentTokens() / 8000) * 100, 100)}%`,
                  background: currentTokens() > 6000 ? '#ef4444' : currentTokens() > 3000 ? '#d97706' : '#16a34a'
                }}
              />
            </div>
            <div style={s.tokenHint}>
              {currentTokens() > 6000
                ? 'Large context — consider task-focused mode'
                : currentTokens() > 3000
                ? 'Medium context'
                : 'Compact context ✓'}
            </div>
          </div>
        </div>

        {/* Right — prompt preview */}
        <div style={s.main}>
          <div style={s.promptHeader}>
            <div style={s.promptTabs}>
              <button
                style={activePrompt === 'full' ? s.promptTabActive : s.promptTab}
                onClick={() => setActivePrompt('full')}
              >
                Full Handoff
              </button>
              {taskPrompt && (
                <button
                  style={activePrompt === 'task' ? s.promptTabActive : s.promptTab}
                  onClick={() => setActivePrompt('task')}
                >
                  Task Context
                </button>
              )}
            </div>
            <div style={s.btnRowSmall}>
              <button style={s.btnCopySmall} onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button style={s.btnCopySmall} onClick={handleDownload}>
                Download
              </button>
            </div>
          </div>

          <div style={s.promptBox}>
            <pre style={s.promptPre}>{currentPrompt()}</pre>
          </div>

          <div style={s.promptFooter}>
            <span style={s.promptFooterText}>
              This context was generated from your project memory (v
              {completeness ? ` ${completeness.filled}/${completeness.total} fields` : ''}).
              Paste it at the start of your agent session.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' },
  center: { textAlign: 'center', padding: '4rem', color: '#6b7280' },
  back: { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1rem', padding: 0 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem' },
  sub: { color: '#6b7280', margin: 0, fontSize: '0.9rem' },
  layout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  main: { display: 'flex', flexDirection: 'column', gap: 0 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem' },
  cardTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: '0 0 1rem' },

  // Completeness
  scoreRow: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  scoreCircle: { width: 64, height: 64, borderRadius: '50%', border: '4px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreNum: { fontSize: '1.1rem', fontWeight: 800 },
  scoreLabel: { fontWeight: 700, fontSize: '0.875rem' },
  scoreSub: { color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.2rem' },
  missingBox: { background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' },
  missingTitle: { fontWeight: 700, fontSize: '0.75rem', color: '#92400e', marginBottom: '0.4rem' },
  missingItem: { fontSize: '0.8rem', color: '#78350f', marginBottom: '0.2rem' },
  missingDot: { color: '#d97706', marginRight: '0.4rem' },
  warningsBox: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' },
  warningTitle: { fontWeight: 700, fontSize: '0.75rem', color: '#9a3412', marginBottom: '0.4rem' },
  warningItem: { fontSize: '0.8rem', color: '#7c2d12', marginBottom: '0.3rem' },
  readyBadge: { background: '#dcfce7', color: '#16a34a', padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', textAlign: 'center' },
  btnFillMemory: { width: '100%', padding: '0.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' },

  // Prompt type
  promptTypes: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  typeBtn: { padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', textAlign: 'left' },
  typeActive: { padding: '0.75rem', background: '#ede9fe', border: '2px solid #4f46e5', borderRadius: 8, cursor: 'pointer', textAlign: 'left' },
  typeName: { fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: '0.2rem' },
  typeDesc: { fontSize: '0.75rem', color: '#6b7280' },

  // Task
  label: { display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#374151', marginBottom: '0.35rem' },
  select: { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', marginBottom: '0.5rem', boxSizing: 'border-box' },
  orDivider: { textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem', margin: '0.5rem 0' },
  taskInput: { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', marginBottom: '0.75rem' },
  btnGenerate: { width: '100%', padding: '0.55rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },

  // Token card
  tokenCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem', textAlign: 'center' },
  tokenLabel: { color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' },
  tokenVal: { fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1 },
  tokenSub: { color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.75rem' },
  tokenBar: { height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginBottom: '0.4rem' },
  tokenFill: { height: '100%', borderRadius: 99, transition: 'width 0.3s' },
  tokenHint: { color: '#6b7280', fontSize: '0.75rem' },

  // Prompt area
  promptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderBottom: 'none', borderRadius: '10px 10px 0 0', padding: '0.75rem 1rem' },
  promptTabs: { display: 'flex', gap: '0.5rem' },
  promptTab: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280', padding: '0.3rem 0.6rem', borderRadius: 6 },
  promptTabActive: { background: '#ede9fe', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#4f46e5', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: 6 },
  btnRowSmall: { display: 'flex', gap: '0.4rem' },
  btnCopySmall: { padding: '0.3rem 0.75rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', color: '#374151' },
  promptBox: { border: '1px solid #e5e7eb', borderRadius: '0 0 10px 10px', background: '#1e1e2e', minHeight: 500, overflow: 'hidden' },
  promptPre: { margin: 0, padding: '1.25rem', fontSize: '0.82rem', fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', color: '#e2e8f0', overflowX: 'auto', lineHeight: 1.6 },
  promptFooter: { marginTop: '0.5rem', textAlign: 'right' },
  promptFooterText: { color: '#9ca3af', fontSize: '0.75rem' },

  // Action buttons
  btnRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  btnCopy: { padding: '0.6rem 1.1rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
  btnDownload: { padding: '0.6rem 1.1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' },
  btnContinue: { padding: '0.6rem 1.1rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', border: '1px solid #fecaca' }
}