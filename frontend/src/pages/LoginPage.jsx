import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [mode,     setMode]     = useState('login')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [message,  setMessage]  = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError('Enter your email address first'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setMessage('Password reset email sent — check your inbox.')
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>ContextBridge</h1>
        <p style={s.sub}>Project memory for AI coding agents</p>

        <div style={s.tabs}>
          <button style={mode === 'login'  ? s.tabOn : s.tabOff} onClick={() => { setMode('login');  setError(''); setMessage('') }}>Sign In</button>
          <button style={mode === 'signup' ? s.tabOn : s.tabOff} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <input
            style={s.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            style={s.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error   && <p style={s.error}>{error}</p>}
          {message && <p style={s.success}>{message}</p>}

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <button style={s.forgot} onClick={handleForgotPassword}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  page:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff', fontFamily: 'system-ui, sans-serif' },
  card:    { background: '#fff', borderRadius: 14, padding: '2.5rem 2rem', width: '100%', maxWidth: 420, boxShadow: '0 4px 32px rgba(79,70,229,0.1)' },
  logo:    { fontSize: '1.8rem', fontWeight: 800, color: '#1e1b4b', margin: '0 0 0.25rem', textAlign: 'center' },
  sub:     { color: '#6b7280', textAlign: 'center', margin: '0 0 1.75rem', fontSize: '0.875rem' },
  tabs:    { display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: '1.5rem', gap: 3 },
  tabOn:   { flex: 1, padding: '0.5rem', background: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#4f46e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  tabOff:  { flex: 1, padding: '0.5rem', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem', color: '#6b7280' },
  form:    { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input:   { padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '1rem', outline: 'none', transition: 'border-color 0.15s' },
  btn:     { padding: '0.8rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' },
  error:   { margin: 0, padding: '0.6rem 0.9rem', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: '0.875rem', border: '1px solid #fecaca' },
  success: { margin: 0, padding: '0.6rem 0.9rem', background: '#f0fdf4', color: '#16a34a', borderRadius: 6, fontSize: '0.875rem', border: '1px solid #bbf7d0' },
  forgot:  { display: 'block', width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' },
}