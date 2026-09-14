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

    // Client-side validation
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
          options: {
            data: {
              full_name: fullName.trim(),  // stored in auth.users.raw_user_meta_data
                                           // trigger copies it to profiles table
            }
          }
        })
        if (error) throw error
        setMessage('Account created! Check your email to confirm, then sign in.')
        setMode('login')
        setEmail(email)  // keep email pre-filled for convenience
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
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoIcon}>CB</div>
          <div>
            <h1 style={s.logoText}>ContextBridge</h1>
            <p style={s.logoSub}>Project memory for AI coding agents</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={s.tabs}>
          <button
            style={mode === 'login'  ? s.tabOn : s.tabOff}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            style={mode === 'signup' ? s.tabOn : s.tabOff}
            onClick={() => switchMode('signup')}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>

          {/* Full name — signup only */}
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

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm password — signup only */}
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

          {/* Feedback */}
          {error   && <div style={s.error}>{error}</div>}
          {message && <div style={s.success}>{message}</div>}

          {/* Submit */}
          <button type="submit" style={s.btn} disabled={loading}>
            {loading
              ? 'Please wait…'
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Forgot password */}
        {mode === 'login' && (
          <button style={s.forgot} onClick={handleForgotPassword} disabled={loading}>
            Forgot password?
          </button>
        )}

        {/* Switch mode hint */}
        <p style={s.switchHint}>
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            style={s.switchBtn}
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #ede9fe 0%, #f0f4ff 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 8px 40px rgba(79,70,229,0.12)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
    marginBottom: '2rem',
  },
  logoIcon: {
    width: 44,
    height: 44,
    background: '#4f46e5',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.95rem',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#1e1b4b',
    margin: 0,
    lineHeight: 1.2,
  },
  logoSub: {
    color: '#6b7280',
    margin: 0,
    fontSize: '0.78rem',
    marginTop: 2,
  },
  tabs: {
    display: 'flex',
    background: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    marginBottom: '1.75rem',
    gap: 4,
  },
  tabOn: {
    flex: 1,
    padding: '0.55rem',
    background: '#fff',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#4f46e5',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.15s',
  },
  tabOff: {
    flex: 1,
    padding: '0.55rem',
    background: 'none',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#6b7280',
    transition: 'all 0.15s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '0.72rem 1rem',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.95rem',
    outline: 'none',
    color: '#111827',
    background: '#fafafa',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    width: '100%',
  },
  btn: {
    padding: '0.82rem',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 700,
    marginTop: '0.25rem',
    transition: 'background 0.15s',
  },
  error: {
    padding: '0.65rem 0.9rem',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: 7,
    fontSize: '0.875rem',
    border: '1px solid #fecaca',
  },
  success: {
    padding: '0.65rem 0.9rem',
    background: '#f0fdf4',
    color: '#16a34a',
    borderRadius: 7,
    fontSize: '0.875rem',
    border: '1px solid #bbf7d0',
  },
  forgot: {
    display: 'block',
    width: '100%',
    marginTop: '0.9rem',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  switchHint: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '0.875rem',
    marginTop: '1.25rem',
    marginBottom: 0,
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    padding: 0,
  },
}