import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [mode,     setMode]     = useState('login')   // 'login' | 'signup'
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [message,  setMessage]  = useState('')
  const navigate = useNavigate()

  function switchMode(next) {
    setMode(next)
    setError('')
    setMessage('')
    setFullName('')
    setEmail('')
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } }
        })
        if (error) throw error
        setMessage('Account created! Check your email to confirm, then sign in.')
        setMode('login')
        setEmail(email)
        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    if (error) setError(error.message)
    else setMessage('Password reset email sent — check your inbox.')
  }

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <div style={s.card}>

        <div style={s.logoRow}>
          <div style={s.logoIcon}>CB</div>
          <div>
            <h1 style={s.logoText}>ContextBridge</h1>
            <p style={s.logoSub}>Project memory for AI coding agents</p>
          </div>
        </div>

        <div style={s.tabs}>
          <button style={mode === 'login' ? s.tabOn : s.tabOff} onClick={() => switchMode('login')}>
            Sign In
          </button>
          <button style={mode === 'signup' ? s.tabOn : s.tabOff} onClick={() => switchMode('signup')}>
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>

          {mode === 'signup' && (
            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input
                style={s.input}
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Email Address</label>
            <input
              style={s.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === 'signup' && (
            <div style={s.field}>
              <label style={s.label}>Confirm Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
          )}

          {error   && <div style={s.error}>{error}</div>}
          {message && <div style={s.success}>{message}</div>}

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <button style={s.forgot} onClick={handleForgotPassword} disabled={loading}>
            Forgot password?
          </button>
        )}

        <p style={s.switchHint}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={s.switchBtn} onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

      </div>
    </div>
  )
}

/* ── ContextBridge ember theme ── */
const c = {
  bg: '#130d0a', bgRaised: '#1c130e', bgCard: '#201712',
  border: '#3a2a1e', borderSoft: '#241a13',
  text: '#f3ece4', textDim: '#a8998b', textFaint: '#6f6053',
  orange: '#ff7a3d', orangeHot: '#ff4d1c',
  danger: '#f87171', dangerBg: 'rgba(248,113,113,0.10)', dangerBorder: 'rgba(248,113,113,0.25)',
  success: '#4ade80', successBg: 'rgba(74,222,128,0.10)', successBorder: 'rgba(74,222,128,0.25)',
}

const s = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: c.bg,
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: '1rem',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    inset: 0,
    background: `radial-gradient(600px circle at 50% 20%, rgba(255,122,61,0.10), transparent 65%)`,
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    background: c.bgCard,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 30px 80px -30px rgba(0,0,0,0.6)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '2rem' },
  logoIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: `linear-gradient(135deg, ${c.orange}, ${c.orangeHot})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#1a0d05', fontWeight: 700, fontSize: '0.95rem',
    fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
  },
  logoText: { fontSize: '1.3rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: c.text, margin: 0, lineHeight: 1.2 },
  logoSub:  { color: c.textFaint, margin: 0, fontSize: '0.78rem', marginTop: 2 },

  tabs: { display: 'flex', background: c.bgRaised, borderRadius: 10, padding: 4, marginBottom: '1.75rem', gap: 4, border: `1px solid ${c.borderSoft}` },
  tabOn: {
    flex: 1, padding: '0.55rem', background: `linear-gradient(135deg, ${c.orange}, ${c.orangeHot})`,
    border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700,
    fontSize: '0.9rem', color: '#1a0d05', transition: 'all 0.15s',
  },
  tabOff: { flex: 1, padding: '0.55rem', background: 'none', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.9rem', color: c.textDim, transition: 'all 0.15s' },

  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.82rem', fontWeight: 600, color: c.textDim },
  input: {
    padding: '0.72rem 1rem', border: `1.5px solid ${c.border}`, borderRadius: 8,
    fontSize: '0.95rem', outline: 'none', color: c.text, background: c.bgRaised,
    transition: 'border-color 0.15s', boxSizing: 'border-box', width: '100%',
    fontFamily: 'inherit',
  },
  btn: {
    padding: '0.82rem', background: `linear-gradient(135deg, ${c.orange}, ${c.orangeHot})`,
    color: '#1a0d05', border: 'none', borderRadius: 9, cursor: 'pointer',
    fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem', transition: 'filter 0.15s',
  },
  error:   { padding: '0.65rem 0.9rem', background: c.dangerBg, color: c.danger, borderRadius: 7, fontSize: '0.875rem', border: `1px solid ${c.dangerBorder}` },
  success: { padding: '0.65rem 0.9rem', background: c.successBg, color: c.success, borderRadius: 7, fontSize: '0.875rem', border: `1px solid ${c.successBorder}` },
  forgot: { display: 'block', width: '100%', marginTop: '0.9rem', background: 'none', border: 'none', color: c.textFaint, cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' },
  switchHint: { textAlign: 'center', color: c.textFaint, fontSize: '0.875rem', marginTop: '1.25rem', marginBottom: 0 },
  switchBtn: { background: 'none', border: 'none', color: c.orange, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: 0 },
}