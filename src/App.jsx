import { useEffect, useMemo, useState } from 'react'
import { Bell, Gamepad2, Home, LogOut, MessageCircle, Search, ShieldCheck, Trophy, UserRound, UsersRound } from 'lucide-react'
import { supabase } from './lib/supabase'

const chats = [
  { name: 'Ana Souza', rank: 'Ouro 2', message: 'Bora jogar depois? 🎮', time: '18:42', unread: 2, online: true },
  { name: 'Carlos M.', rank: 'Prata 3', message: 'Vi sua nova foto 😄', time: '17:58', unread: 0, online: true },
  { name: 'Maya', rank: 'Diamante 1', message: 'Mandou muito no quiz!', time: '16:31', unread: 1, online: false },
  { name: 'Rafael', rank: 'Bronze 2', message: 'Até amanhã!', time: '14:07', unread: 0, online: false }
]

const groups = [
  { name: 'Turma PAI', members: 23, message: 'Novo desafio no grupo 🎯', time: '18:10' },
  { name: 'Gamers da Noite', members: 41, message: 'Quem fecha Quatro em Linha?', time: '17:22' }
]

function Splash({ onDone }) {
  return (
    <button className="splash" onClick={onDone} aria-label="Entrar no PAI">
      <div className="orbit orbit-one">💬</div>
      <div className="orbit orbit-two">🎮</div>
      <div className="orbit orbit-three">💎</div>
      <div className="orbit orbit-four">🏆</div>
      <div className="orbit orbit-five">👑</div>
      <div className="logo-mark">PAI</div>
      <span>toque para entrar</span>
    </button>
  )
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName.trim() || email.split('@')[0] }
          }
        })
        if (error) throw error
        setMessage('Conta criada. Se o Supabase pedir confirmação, verifique seu e-mail.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setMessage(error.message || 'Não foi possível continuar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">PAI</div>
        <p className="auth-kicker">Converse. Jogue. Evolua.</p>
        <h1>{mode === 'login' ? 'Entrar na sua conta' : 'Criar uma nova conta'}</h1>
        <p className="auth-copy">
          {mode === 'login'
            ? 'Entre com seu e-mail e senha para continuar.'
            : 'Crie sua conta e comece no Bronze 1.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Nome
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" maxLength={40} />
            </label>
          )}
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" required />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" minLength={6} required />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <button className="link-button" onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login')
          setMessage('')
        }}>
          {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}
        </button>
      </div>
    </div>
  )
}

function ChatRow({ chat }) {
  return (
    <button className="chat-row">
      <div className="avatar-wrap">
        <div className="avatar">{chat.name.slice(0, 1)}</div>
        {chat.online && <span className="online-dot" />}
      </div>
      <div className="chat-main">
        <div className="chat-line">
          <strong>{chat.name}</strong>
          <span>{chat.time}</span>
        </div>
        <div className="chat-line secondary">
          <span className="rank-badge">{chat.rank}</span>
          <span className="message-preview">{chat.message}</span>
          {chat.unread > 0 && <span className="unread">{chat.unread}</span>}
        </div>
      </div>
    </button>
  )
}

function GroupRow({ group }) {
  return (
    <button className="chat-row">
      <div className="avatar group-avatar"><UsersRound size={20} /></div>
      <div className="chat-main">
        <div className="chat-line">
          <strong>{group.name}</strong>
          <span>{group.time}</span>
        </div>
        <div className="chat-line secondary">
          <span>{group.members} membros</span>
          <span className="message-preview">{group.message}</span>
        </div>
      </div>
    </button>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('conversas')
  const [query, setQuery] = useState('')
  const [session, setSession] = useState(null)
  const [account, setAccount] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setAccount(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    async function loadAccount() {
      const userId = session.user.id
      const [profileResult, walletResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('display_name, rank_name, points, avatar_url').eq('user_id', userId).single(),
        supabase.from('wallets').select('coins, diamonds').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).single(),
      ])

      setAccount({
        profile: profileResult.data,
        wallet: walletResult.data,
        role: roleResult.data?.role || 'user',
      })
    }

    loadAccount()
  }, [session])

  const filteredChats = useMemo(
    () => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />
  if (authLoading) return <div className="loading-screen">Carregando PAI...</div>
  if (!session) return <AuthScreen />

  const displayName = account?.profile?.display_name || session.user.email?.split('@')[0] || 'Usuário'
  const rankName = account?.profile?.rank_name || 'Bronze 1'
  const points = account?.profile?.points ?? 0
  const coins = account?.wallet?.coins ?? 0
  const diamonds = account?.wallet?.diamonds ?? 0
  const isOwner = account?.role === 'owner'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">olá, {displayName}</p>
          <h1>PAI</h1>
        </div>
        <div className="top-actions">
          {isOwner && <button aria-label="Painel administrativo" title="Administrador"><ShieldCheck size={21} /></button>}
          <button aria-label="Notificações" className="notification-button"><Bell size={21} /><span /></button>
          <button aria-label="Sair da conta" onClick={() => supabase.auth.signOut()}><LogOut size={20} /></button>
        </div>
      </header>

      <main className="content-card">
        <div className="account-strip">
          <div>
            <strong>{rankName}</strong>
            <span>{points.toLocaleString('pt-BR')} pontos</span>
          </div>
          {isOwner && <span className="owner-chip">OWNER</span>}
        </div>

        <div className="section-heading">
          <div>
            <h2>Conversas</h2>
            <p>Fale com seus amigos e entre nos grupos.</p>
          </div>
          <div className="wallet-mini">
            <span>🪙 {coins.toLocaleString('pt-BR')}</span>
            <span>💎 {diamonds.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversa" />
        </div>

        <div className="segmented">
          <button className={tab === 'conversas' ? 'active' : ''} onClick={() => setTab('conversas')}>Amigos</button>
          <button className={tab === 'grupos' ? 'active' : ''} onClick={() => setTab('grupos')}>Grupos</button>
        </div>

        <section className="chat-list">
          {tab === 'conversas'
            ? filteredChats.map((chat) => <ChatRow key={chat.name} chat={chat} />)
            : groups.map((group) => <GroupRow key={group.name} group={group} />)}
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <button><Home size={20} /><span>Início</span></button>
        <button><Gamepad2 size={20} /><span>Jogos</span></button>
        <button className="active"><MessageCircle size={20} /><span>Conversas</span></button>
        <button><Trophy size={20} /><span>Ranking</span></button>
        <button><UserRound size={20} /><span>Perfil</span></button>
      </nav>
    </div>
  )
}
