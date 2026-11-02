import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import GoogleLoginDock from './GoogleLoginDock'
import './features.css'

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || email.split('@')[0] } },
        })
        if (error) throw error
        setMsg('Conta criada. Se for solicitado, confirme o e-mail.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMsg(err.message || 'Não foi possível continuar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">PAI</div>
        <p className="auth-kicker">Converse. Jogue. Compartilhe.</p>
        <h1>{mode === 'login' ? 'Entrar na sua conta' : 'Criar uma nova conta'}</h1>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>Nome<input value={name} onChange={e => setName(e.target.value)} required /></label>
          )}
          <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Senha<input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <button className="primary-button" disabled={loading}>
            {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        {msg && <p className="auth-message">{msg}</p>}
        <button className="link-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}
        </button>
      </div>
    </div>
  )
}

export default function App2() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-screen">Carregando PAI...</div>

  return (
    <>
      <AuthScreen />
      <GoogleLoginDock />
    </>
  )
}
