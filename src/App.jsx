import { useMemo, useState } from 'react'
import { Bell, Gamepad2, Home, MessageCircle, Search, Trophy, UserRound, UsersRound } from 'lucide-react'

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

  const filteredChats = useMemo(
    () => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">bem-vindo ao</p>
          <h1>PAI</h1>
        </div>
        <div className="top-actions">
          <button aria-label="Pesquisar"><Search size={21} /></button>
          <button aria-label="Notificações" className="notification-button"><Bell size={21} /><span /></button>
        </div>
      </header>

      <main className="content-card">
        <div className="section-heading">
          <div>
            <h2>Conversas</h2>
            <p>Fale com seus amigos e entre nos grupos.</p>
          </div>
          <div className="wallet-mini">
            <span>🪙 2.450</span>
            <span>💎 18</span>
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
