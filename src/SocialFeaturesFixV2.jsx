import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Camera, Crown, Image as ImageIcon, MessageCircle, MoreVertical, Plus, Send, Trash2, Trophy, Users, X } from 'lucide-react'
import { supabase } from './lib/supabase'

const fmt = n => Number(n || 0).toLocaleString('pt-BR')
const age = value => {
  if (!value) return ''
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} d`
}

function Avatar({ profile, fallback = '?' }) {
  const name = profile?.display_name || fallback
  return <span className="sfx2-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : name.slice(0, 1).toUpperCase()}</span>
}

function ConversationsFix({ userId }) {
  const [convos, setConvos] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [people, setPeople] = useState({})

  async function loadConvos() {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id,addressee_id,status')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    const friendIds = new Set((friendships || []).map(f => f.requester_id === userId ? f.addressee_id : f.requester_id))
    const { data: memberships } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', userId)
    const ids = [...new Set((memberships || []).map(x => x.conversation_id))]
    if (!ids.length) { setConvos([]); setPeople({}); return }

    const [{ data: conversations }, { data: allMembers }] = await Promise.all([
      supabase.from('conversations').select('*').in('id', ids).order('created_at', { ascending: false }),
      supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids)
    ])

    const memberMap = new Map()
    for (const row of allMembers || []) {
      if (!memberMap.has(row.conversation_id)) memberMap.set(row.conversation_id, [])
      memberMap.get(row.conversation_id).push(row.user_id)
    }

    const valid = (conversations || []).filter(c => {
      if (c.kind !== 'direct') return true
      const others = (memberMap.get(c.id) || []).filter(id => id !== userId)
      return others.length === 1 && friendIds.has(others[0])
    }).map(c => ({ ...c, otherUserId: c.kind === 'direct' ? (memberMap.get(c.id) || []).find(id => id !== userId) : null }))

    setConvos(valid)
    const otherIds = [...new Set(valid.map(c => c.otherUserId).filter(Boolean))]
    if (otherIds.length) {
      const { data: ps } = await supabase.from('profiles').select('user_id,display_name,avatar_url').in('user_id', otherIds)
      setPeople(Object.fromEntries((ps || []).map(p => [p.user_id, p])))
    } else setPeople({})
  }

  useEffect(() => { loadConvos() }, [userId])

  useEffect(() => {
    if (!selected) return
    let alive = true
    supabase.from('messages').select('*').eq('conversation_id', selected.id).order('created_at').limit(200).then(({ data }) => alive && setMessages(data || []))
    const channel = supabase.channel(`sfx2-chat-${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.id}` }, payload => setMessages(v => [...v, payload.new]))
      .subscribe()
    return () => { alive = false; supabase.removeChannel(channel) }
  }, [selected?.id])

  async function send() {
    const body = text.trim()
    if (!selected || !body) return
    setText('')
    await supabase.from('messages').insert({ conversation_id: selected.id, sender_id: userId, body })
  }

  if (selected) {
    const other = selected.otherUserId ? people[selected.otherUserId] : null
    return <div className="sfx2-screen">
      <header className="sfx2-top"><button onClick={() => setSelected(null)}><ArrowLeft /></button><Avatar profile={other} fallback={selected.title || 'C'} /><div><h2>{other?.display_name || selected.title || 'Conversa'}</h2><small>{selected.kind || 'privada'}</small></div></header>
      <div className="sfx2-messages">{messages.length ? messages.map(m => <div key={m.id} className={`sfx2-msg ${m.sender_id === userId ? 'mine' : ''}`}><span>{m.body}</span><small>{age(m.created_at)}</small></div>) : <div className="sfx2-empty">Nenhuma mensagem ainda.</div>}</div>
      <div className="sfx2-compose"><input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Digite uma mensagem..."/><button onClick={send}><Send /></button></div>
    </div>
  }

  return <div className="sfx2-screen">
    <header className="sfx2-title"><h1><MessageCircle/> Conversas</h1></header>
    <div className="sfx2-tabs"><button className="active">Conversas</button></div>
    <div className="sfx2-list">{convos.length ? convos.map(c => { const other = c.otherUserId ? people[c.otherUserId] : null; return <button key={c.id} onClick={() => setSelected(c)}><Avatar profile={other} fallback={c.title || 'C'} /><div><b>{other?.display_name || c.title || 'Conversa'}</b><span>{c.kind === 'direct' ? 'Amigo' : c.kind || 'Conversa'}</span></div><small>{age(c.created_at)}</small></button> }) : <div className="sfx2-empty"><MessageCircle/><h3>Você ainda não tem conversas</h3><p>As conversas só aparecem aqui quando forem reais. Se você ainda não tiver amigos, não serão mostradas conversas falsas.</p></div>}</div>
  </div>
}

function PhotosFix({ userId }) {
  const [tab, setTab] = useState('mine')
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [menuId, setMenuId] = useState(null)
  const inputRef = useRef(null)

  async function load(nextTab = tab) {
    setMsg('')
    let query = supabase.from('posts').select('id,user_id,image_url,caption,created_at').order('created_at', { ascending: false }).limit(50)
    if (nextTab === 'mine') query = query.eq('user_id', userId)
    if (nextTab === 'following') {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
      const ids = (follows || []).map(x => x.following_id)
      if (!ids.length) { setPosts([]); setProfiles({}); return }
      query = query.in('user_id', ids)
    }
    const { data, error } = await query
    if (error) return setMsg(error.message)
    const rows = data || []
    setPosts(rows)
    const ids = [...new Set(rows.map(x => x.user_id))]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('user_id,display_name,avatar_url').in('user_id', ids)
      setProfiles(Object.fromEntries((ps || []).map(p => [p.user_id, p])))
    } else setProfiles({})
  }

  useEffect(() => { load(tab) }, [tab, userId])

  async function uploadPhoto(file) {
    if (!file || busy) return
    setBusy(true); setMsg('')
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/post-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('pai-social').upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const url = supabase.storage.from('pai-social').getPublicUrl(path).data.publicUrl
      const { error } = await supabase.from('posts').insert({ user_id: userId, image_url: url, caption: '' })
      if (error) throw error
      setTab('mine'); await load('mine'); setMsg('Foto adicionada com sucesso.')
    } catch (e) { setMsg(e.message || 'Não foi possível adicionar a foto.') }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }

  async function removePost(post) {
    if (post.user_id !== userId || !confirm('Excluir esta foto?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', userId)
    setMenuId(null)
    setMsg(error ? error.message : 'Foto excluída.')
    if (!error) load(tab)
  }

  return <div className="sfx2-screen">
    <header className="sfx2-title"><h1>📸 Fotos</h1><button onClick={() => inputRef.current?.click()} disabled={busy}><Plus/></button><input ref={inputRef} type="file" accept="image/*" hidden onChange={e => uploadPhoto(e.target.files?.[0])}/></header>
    <div className="sfx2-tabs"><button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Seguindo</button><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>Descobrir</button><button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>Minhas fotos</button></div>
    {msg && <div className="sfx2-notice">{msg}</div>}
    <div className="sfx2-photo-feed">{posts.length ? posts.map(p => { const profile = profiles[p.user_id] || {}; return <article key={p.id}><header><Avatar profile={profile} fallback="P"/><div><b>{profile.display_name || (p.user_id === userId ? 'Você' : 'Usuário')}</b><span>{age(p.created_at)}</span></div>{p.user_id === userId && <div className="sfx2-menu-wrap"><button className="sfx2-more" onClick={() => setMenuId(menuId === p.id ? null : p.id)} title="Opções da foto"><MoreVertical/></button>{menuId === p.id && <div className="sfx2-menu"><button onClick={() => removePost(p)}><Trash2/> Excluir foto</button></div>}</div>}</header>{p.image_url && <img src={p.image_url} alt="Publicação"/>}{p.caption && <p>{p.caption}</p>}</article> }) : <div className="sfx2-empty"><ImageIcon/><h3>{tab === 'mine' ? 'Você ainda não adicionou fotos' : tab === 'following' ? 'Nenhuma foto de quem você segue' : 'Nenhuma foto para descobrir agora'}</h3>{tab === 'mine' && <button className="sfx2-primary" onClick={() => inputRef.current?.click()}><Camera/> Adicionar foto</button>}</div>}</div>
  </div>
}

function ClanFix({ userId }) {
  const [profile, setProfile] = useState(null)
  const [ranks, setRanks] = useState([])
  const [clan, setClan] = useState(null)
  const [members, setMembers] = useState([])
  const [profiles, setProfiles] = useState({})
  const [messages, setMessages] = useState([])
  const [tab, setTab] = useState('chat')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const [{ data: p }, { data: rs }, { data: cm }] = await Promise.all([
      supabase.from('profiles').select('user_id,display_name,rank_name,points').eq('user_id', userId).single(),
      supabase.from('ranks').select('name,level,min_points').order('level'),
      supabase.from('clan_members').select('*').eq('user_id', userId).maybeSingle()
    ])
    setProfile(p); setRanks(rs || [])
    if (!cm) { setClan(null); setMembers([]); setMessages([]); setProfiles({}); return }
    const [{ data: c }, { data: ms }, { data: chat }] = await Promise.all([
      supabase.from('clans').select('*').eq('id', cm.clan_id).single(),
      supabase.from('clan_members').select('*').eq('clan_id', cm.clan_id).order('joined_at'),
      supabase.from('clan_messages').select('*').eq('clan_id', cm.clan_id).order('created_at').limit(100)
    ])
    setClan(c); setMembers(ms || []); setMessages(chat || [])
    const ids = [...new Set((ms || []).map(x => x.user_id))]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('user_id,display_name,rank_name,points,avatar_url').in('user_id', ids)
      setProfiles(Object.fromEntries((ps || []).map(x => [x.user_id, x])))
    } else setProfiles({})
  }

  useEffect(() => { load() }, [userId])

  const canCreate = useMemo(() => {
    const current = ranks.find(r => r.name === profile?.rank_name)?.level || 0
    return current >= 6
  }, [ranks, profile?.rank_name])

  async function createClan() {
    if (!canCreate) return setMsg('Você precisa alcançar a patente Ouro 1 para criar um clã.')
    if (!name.trim() || !tag.trim()) return setMsg('Informe o nome e a TAG do clã.')
    const { error } = await supabase.rpc('create_clan', { p_name: name.trim(), p_tag: tag.trim().toUpperCase().slice(0, 6) })
    if (error) return setMsg(error.message === 'requires 500 diamonds' ? 'Você precisa de 500 diamantes para criar o clã.' : error.message)
    setCreating(false); setName(''); setTag(''); setMsg('Clã criado com sucesso.'); await load()
  }

  async function sendClan() {
    const body = text.trim()
    if (!body || !clan) return
    setText('')
    const { error } = await supabase.from('clan_messages').insert({ clan_id: clan.id, sender_id: userId, body })
    if (error) setMsg(error.message); else load()
  }

  if (!clan) return <div className="sfx2-screen"><header className="sfx2-title"><h1><Crown/> Clã</h1></header><div className="sfx2-empty sfx2-clan-empty"><Crown/><h2>Crie seu próprio clã</h2><p>Para criar um novo clã, sua conta precisa ter alcançado a patente <b>Ouro 1</b> ou superior e possuir <b>500 diamantes</b>.</p><div className={`sfx2-rank-check ${canCreate ? 'ok' : ''}`}>Sua patente: <b>{profile?.rank_name || '—'}</b></div>{canCreate ? <button className="sfx2-primary" onClick={() => setCreating(true)}><Plus/> Criar clã</button> : <button className="sfx2-primary" disabled>🔒 Alcance Ouro 1 para criar</button>}{msg && <div className="sfx2-notice">{msg}</div>}{creating && <div className="sfx2-modal"><div><button className="sfx2-close" onClick={() => setCreating(false)}><X/></button><h2>Novo clã</h2><label>Nome<input value={name} onChange={e => setName(e.target.value)} maxLength={32}/></label><label>TAG<input value={tag} onChange={e => setTag(e.target.value)} maxLength={6}/></label><button className="sfx2-primary" onClick={createClan}>Criar clã</button></div></div>}</div></div>

  const sorted = [...members].sort((a, b) => Number(profiles[b.user_id]?.points || 0) - Number(profiles[a.user_id]?.points || 0))
  return <div className="sfx2-screen"><header className="sfx2-title"><h1><Crown/> {clan.name}</h1><span className="sfx2-tag">{clan.tag}</span></header><section className="sfx2-clan-hero"><div>👑</div><div><h2>{clan.name}</h2><p>{members.length} membros</p><b>🏆 {fmt(clan.points)} pts</b></div></section><div className="sfx2-tabs"><button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>Chat</button><button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Membros</button><button className={tab === 'ranking' ? 'active' : ''} onClick={() => setTab('ranking')}>Ranking</button><button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Eventos</button></div>{msg && <div className="sfx2-notice">{msg}</div>}
    {tab === 'chat' && <><div className="sfx2-clan-chat">{messages.length ? messages.map(m => <div key={m.id}><b>{profiles[m.sender_id]?.display_name || 'Membro'}</b><span>{m.body}</span><small>{age(m.created_at)}</small></div>) : <div className="sfx2-empty">Ainda não há mensagens no clã.</div>}</div><div className="sfx2-compose"><input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendClan()} placeholder="Mensagem para o clã..."/><button onClick={sendClan}><Send/></button></div></>}
    {tab === 'members' && <div className="sfx2-list">{members.length ? members.map(m => <div className="sfx2-member" key={m.user_id}><Avatar profile={profiles[m.user_id]}/><div><b>{profiles[m.user_id]?.display_name || 'Usuário'}</b><span>{profiles[m.user_id]?.rank_name || ''} • {m.clan_role}</span></div></div>) : <div className="sfx2-empty"><Users/><h3>Sem membros</h3></div>}</div>}
    {tab === 'ranking' && <div className="sfx2-ranking">{sorted.length ? sorted.map((m, i) => <div key={m.user_id}><b>{i + 1}</b><Avatar profile={profiles[m.user_id]}/><div><strong>{profiles[m.user_id]?.display_name || 'Usuário'}</strong><span>{profiles[m.user_id]?.rank_name || ''}</span></div><em>{fmt(profiles[m.user_id]?.points)} pts</em></div>) : <div className="sfx2-empty"><Trophy/><h3>Ranking vazio</h3></div>}</div>}
    {tab === 'events' && <div className="sfx2-empty"><Trophy/><h3>Eventos do clã</h3><p>Nenhum evento agendado no momento.</p></div>}
  </div>
}

export default function SocialFeaturesFixV2() {
  const [session, setSession] = useState(null)
  const [target, setTarget] = useState({ host: null, kind: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const sync = () => {
      const pages = [...document.querySelectorAll('.ra-main .ra-page')]
      const host = pages.find(p => p.offsetParent !== null) || pages[0] || null
      if (!host) return setTarget({ host: null, kind: null })
      const text = host.querySelector('h1')?.textContent || ''
      const kind = text.includes('Conversas') ? 'chat' : text.includes('Fotos') ? 'photos' : text.includes('Clã') ? 'clan' : null
      setTarget(prev => prev.host === host && prev.kind === kind ? prev : { host, kind })
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!target.host || !target.kind) return
    target.host.classList.add('sfx2-host')
    return () => target.host?.classList.remove('sfx2-host')
  }, [target.host, target.kind])

  if (!session?.user?.id || !target.host || !target.kind) return null
  const body = target.kind === 'chat' ? <ConversationsFix userId={session.user.id}/> : target.kind === 'photos' ? <PhotosFix userId={session.user.id}/> : <ClanFix userId={session.user.id}/>

  return createPortal(<><style>{`
    .sfx2-host>*:not(.sfx2-root){display:none!important}.sfx2-root{display:block!important;width:100%;min-height:100%}
    .sfx2-screen{padding:18px;color:#eef3ff}.sfx2-title,.sfx2-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.sfx2-top>div{flex:1}.sfx2-title h1,.sfx2-top h2{display:flex;align-items:center;gap:10px;margin:0}.sfx2-title button,.sfx2-top button,.sfx2-compose button,.sfx2-more{border:0;background:#17203a;color:#fff;border-radius:12px;padding:10px;cursor:pointer}.sfx2-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}.sfx2-tabs button{border:1px solid #2b3a65;background:#10172a;color:#b9c5df;border-radius:999px;padding:9px 14px;cursor:pointer}.sfx2-tabs button.active{background:#6246ff;color:#fff;border-color:#7b66ff}.sfx2-list{display:grid;gap:10px}.sfx2-list>button,.sfx2-member{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid #263250;background:#11192c;color:#fff;border-radius:15px;padding:12px}.sfx2-list>button div,.sfx2-member div{display:grid;flex:1}.sfx2-list span,.sfx2-member span{color:#8fa1c4;font-size:13px}.sfx2-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#29365d;overflow:hidden;flex:0 0 auto}.sfx2-avatar img{width:100%;height:100%;object-fit:cover}.sfx2-empty{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;color:#9eacc9}.sfx2-empty svg{width:42px;height:42px}.sfx2-empty h3,.sfx2-empty h2{color:#fff;margin:0}.sfx2-empty p{max-width:520px;margin:0}.sfx2-photo-feed{display:grid;gap:16px;max-width:760px}.sfx2-photo-feed article{background:#11192c;border:1px solid #263250;border-radius:16px;overflow:visible}.sfx2-photo-feed article>header{display:flex;align-items:center;gap:10px;padding:12px;position:relative}.sfx2-photo-feed article>header>div:not(.sfx2-menu-wrap){display:grid;flex:1}.sfx2-photo-feed article>header span{color:#8fa1c4;font-size:12px}.sfx2-photo-feed article>img{width:100%;max-height:600px;object-fit:cover;background:#080b13}.sfx2-photo-feed article>p{padding:0 14px 14px}.sfx2-menu-wrap{position:relative}.sfx2-menu{position:absolute;right:0;top:48px;z-index:10;background:#11192c;border:1px solid #2b3a65;border-radius:12px;padding:6px;min-width:150px;box-shadow:0 14px 35px rgba(0,0,0,.35)}.sfx2-menu button{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#ff8585;padding:10px;border-radius:8px;cursor:pointer}.sfx2-notice{margin:10px 0;padding:10px 12px;background:#17203a;border-radius:10px}.sfx2-primary{display:inline-flex;align-items:center;gap:8px;border:0;background:linear-gradient(135deg,#6246ff,#00c2ff);color:#fff;border-radius:12px;padding:11px 16px;font-weight:700;cursor:pointer}.sfx2-primary:disabled{opacity:.45;cursor:not-allowed}.sfx2-rank-check{padding:10px 14px;border:1px solid #49304f;background:#24172b;border-radius:12px}.sfx2-rank-check.ok{border-color:#24664f;background:#112a23}.sfx2-modal{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(3,5,12,.78);padding:20px}.sfx2-modal>div{width:min(420px,100%);background:#11192c;border:1px solid #2d3a5f;border-radius:18px;padding:20px;position:relative}.sfx2-modal label{display:grid;gap:6px;margin:12px 0}.sfx2-modal input,.sfx2-compose input{background:#0a1020;border:1px solid #2b3a65;color:#fff;border-radius:12px;padding:12px}.sfx2-close{position:absolute;right:12px;top:12px;border:0;background:transparent;color:#fff}.sfx2-clan-hero{display:flex;gap:16px;align-items:center;background:#11192c;border:1px solid #263250;border-radius:16px;padding:16px;margin-bottom:16px}.sfx2-clan-hero>div:first-child{font-size:42px}.sfx2-clan-hero h2,.sfx2-clan-hero p{margin:0 0 5px}.sfx2-tag{background:#222d4c;border-radius:999px;padding:6px 10px}.sfx2-clan-chat{display:grid;gap:8px;max-height:420px;overflow:auto}.sfx2-clan-chat>div{display:grid;grid-template-columns:auto 1fr auto;gap:10px;background:#11192c;border-radius:12px;padding:10px}.sfx2-clan-chat small{color:#8495b8}.sfx2-compose{display:flex;gap:8px;margin-top:12px}.sfx2-compose input{flex:1}.sfx2-messages{display:flex;flex-direction:column;gap:8px;min-height:360px}.sfx2-msg{align-self:flex-start;display:grid;gap:3px;background:#17203a;border-radius:14px;padding:10px 12px;max-width:75%}.sfx2-msg.mine{align-self:flex-end;background:#4c3bd8}.sfx2-msg small{opacity:.7;font-size:11px}.sfx2-ranking{display:grid;gap:8px}.sfx2-ranking>div:not(.sfx2-empty){display:grid;grid-template-columns:34px 42px 1fr auto;align-items:center;gap:10px;background:#11192c;border:1px solid #263250;border-radius:12px;padding:10px}.sfx2-ranking>div>div{display:grid}.sfx2-ranking span{color:#8fa1c4;font-size:12px}.sfx2-ranking em{font-style:normal;font-weight:700}
  `}</style><div className="sfx2-root">{body}</div></>, target.host)
}
