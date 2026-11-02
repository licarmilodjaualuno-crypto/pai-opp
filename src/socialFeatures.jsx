import { useEffect, useMemo, useState } from 'react'
import { Bell, Camera, Crown, Eye, Gift, Heart, Lock, MessageCircle, Mic, Plus, Radio, Send, Settings, Sparkles, Star, Ticket, UserPlus, Users } from 'lucide-react'
import { supabase } from './lib/supabase'

export function FeaturePanel({ title, subtitle, children, action }) {
  return <section className="content-card"><div className="section-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}</section>
}

const asMap=(rows,key='user_id')=>Object.fromEntries((rows||[]).map(x=>[x[key],x]))

async function uploadImage(file,userId,prefix){
  if(!file) return null
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase()
  const path=`${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`
  const {error}=await supabase.storage.from('pai-social').upload(path,file,{cacheControl:'3600',upsert:false})
  if(error) throw error
  return supabase.storage.from('pai-social').getPublicUrl(path).data.publicUrl
}

export function PhotosPage({userId,onWalletRefresh}){
  const [posts,setPosts]=useState([]),[profiles,setProfiles]=useState({}),[likes,setLikes]=useState([]),[comments,setComments]=useState([])
  const [file,setFile]=useState(null),[caption,setCaption]=useState(''),[drafts,setDrafts]=useState({}),[msg,setMsg]=useState('')
  async function load(){
    const [{data:p},{data:pr},{data:l},{data:c}]=await Promise.all([
      supabase.from('posts').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('user_id,display_name,rank_name,avatar_url'),
      supabase.from('post_likes').select('*'),
      supabase.from('post_comments').select('*').order('created_at',{ascending:true})
    ])
    setPosts(p||[]);setProfiles(asMap(pr));setLikes(l||[]);setComments(c||[])
  }
  useEffect(()=>{load()},[])
  async function publish(){
    if(!file) return setMsg('Escolha uma foto primeiro.')
    try{
      const url=await uploadImage(file,userId,'post')
      const {error}=await supabase.from('posts').insert({user_id:userId,image_url:url,caption:caption.trim()})
      if(error) throw error
      setFile(null);setCaption('');setMsg('Foto publicada.');await load()
    }catch(e){setMsg(e.message||'Não foi possível publicar.')}
  }
  async function toggleLike(post){
    const mine=likes.some(x=>x.post_id===post.id&&x.user_id===userId)
    const q=mine?supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',userId):supabase.from('post_likes').insert({post_id:post.id,user_id:userId})
    const {error}=await q;if(error)setMsg(error.message);else{await load();onWalletRefresh?.()}
  }
  async function addComment(post){
    const body=(drafts[post.id]||'').trim();if(!body)return
    const {error}=await supabase.from('post_comments').insert({post_id:post.id,user_id:userId,body})
    if(error)setMsg(error.message);else{setDrafts(d=>({...d,[post.id]:''}));await load();onWalletRefresh?.()}
  }
  return <FeaturePanel title="Fotos" subtitle="Somente fotos • até 20 postagens por usuário">
    <div className="social-create"><label className="upload-box"><Camera size={22}/><span>{file?file.name:'Escolher foto'}</span><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={300} placeholder="Escreva uma legenda"/><button className="primary-button" onClick={publish}><Plus size={18}/> Publicar</button></div>
    <div className="reward-note">❤️ primeira curtida válida de cada pessoa: +5 💎 • 💬 primeiro comentário válido: +10 💎 +100 🪙</div>
    {msg&&<p className="notice">{msg}</p>}
    <div className="photo-feed">{posts.map(post=>{const p=profiles[post.user_id]||{};const pl=likes.filter(x=>x.post_id===post.id);const pc=comments.filter(x=>x.post_id===post.id);const liked=pl.some(x=>x.user_id===userId);return <article className="photo-post" key={post.id}><div className="post-head"><div className="avatar">{(p.display_name||'?').slice(0,1)}</div><div><strong>{p.display_name||'Usuário'}</strong><span>{p.rank_name||''}</span></div></div><img src={post.image_url} alt={post.caption||'Foto publicada no PAI'}/>{post.caption&&<p>{post.caption}</p>}<div className="post-actions"><button className={liked?'active':''} onClick={()=>toggleLike(post)}><Heart size={18}/> {pl.length}</button><span><MessageCircle size={18}/> {pc.length}</span></div><div className="comment-list">{pc.slice(-4).map(c=><p key={c.id}><b>{profiles[c.user_id]?.display_name||'Usuário'}:</b> {c.body}</p>)}</div><div className="inline-composer"><input value={drafts[post.id]||''} onChange={e=>setDrafts(d=>({...d,[post.id]:e.target.value}))} placeholder="Comentar"/><button onClick={()=>addComment(post)}><Send size={17}/></button></div></article>})}</div>
  </FeaturePanel>
}

export function StatusPage({userId,onWalletRefresh}){
  const [rows,setRows]=useState([]),[profiles,setProfiles]=useState({}),[views,setViews]=useState([]),[likes,setLikes]=useState([]),[comments,setComments]=useState([])
  const [file,setFile]=useState(null),[body,setBody]=useState(''),[drafts,setDrafts]=useState({}),[msg,setMsg]=useState('')
  async function load(){
    const [{data:s},{data:p},{data:v},{data:l},{data:c}]=await Promise.all([
      supabase.from('statuses').select('*').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
      supabase.from('profiles').select('user_id,display_name,rank_name'),supabase.from('status_views').select('*'),supabase.from('status_likes').select('*'),supabase.from('status_comments').select('*').order('created_at')
    ])
    setRows(s||[]);setProfiles(asMap(p));setViews(v||[]);setLikes(l||[]);setComments(c||[])
    const unseen=(s||[]).filter(x=>x.user_id!==userId&&!(v||[]).some(y=>y.status_id===x.id&&y.user_id===userId))
    if(unseen.length) await supabase.from('status_views').upsert(unseen.map(x=>({status_id:x.id,user_id:userId})),{onConflict:'status_id,user_id',ignoreDuplicates:true})
  }
  useEffect(()=>{load()},[])
  async function publish(){
    if(!body.trim()&&!file)return setMsg('Adicione texto ou uma foto.')
    try{const image_url=file?await uploadImage(file,userId,'status'):null;const {error}=await supabase.from('statuses').insert({user_id:userId,image_url,body:body.trim()});if(error)throw error;setBody('');setFile(null);setMsg('Status publicado por 24 horas.');await load()}catch(e){setMsg(e.message)}
  }
  async function toggleLike(id){const mine=likes.some(x=>x.status_id===id&&x.user_id===userId);const q=mine?supabase.from('status_likes').delete().eq('status_id',id).eq('user_id',userId):supabase.from('status_likes').insert({status_id:id,user_id:userId});const {error}=await q;if(error)setMsg(error.message);else{await load();onWalletRefresh?.()}}
  async function comment(id){const text=(drafts[id]||'').trim();if(!text)return;const {error}=await supabase.from('status_comments').insert({status_id:id,user_id:userId,body:text});if(error)setMsg(error.message);else{setDrafts(d=>({...d,[id]:''}));await load();onWalletRefresh?.()}}
  return <FeaturePanel title="Status" subtitle="Fotos e texto que desaparecem automaticamente">
    <div className="social-create"><label className="upload-box"><Camera size={22}/><span>{file?file.name:'Foto opcional'}</span><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><input value={body} onChange={e=>setBody(e.target.value)} maxLength={280} placeholder="O que está acontecendo?"/><button className="primary-button" onClick={publish}>Publicar status</button></div>
    <div className="reward-note">👁️ 100 visualizações válidas: +20 💎 • ❤️ primeira curtida: +1 💎 • 💬 primeiro comentário de cada amigo: +5 💎 +50 🪙</div>
    {msg&&<p className="notice">{msg}</p>}
    <div className="status-grid">{rows.map(s=>{const p=profiles[s.user_id]||{};const sc=comments.filter(x=>x.status_id===s.id);const sl=likes.filter(x=>x.status_id===s.id);return <article className="status-card" key={s.id}>{s.image_url&&<img src={s.image_url} alt="Status"/>}<div className="status-overlay"><strong>{p.display_name||'Usuário'}</strong>{s.body&&<p>{s.body}</p>}<div className="status-stats"><span><Eye size={16}/>{views.filter(x=>x.status_id===s.id).length}</span><button onClick={()=>toggleLike(s.id)}><Heart size={16}/>{sl.length}</button><span><MessageCircle size={16}/>{sc.length}</span></div><div className="inline-composer"><input value={drafts[s.id]||''} onChange={e=>setDrafts(d=>({...d,[s.id]:e.target.value}))} placeholder="Comentar"/><button onClick={()=>comment(s.id)}><Send size={16}/></button></div></div></article>})}</div>
  </FeaturePanel>
}

export function VoiceRoomsPage({userId,onWalletRefresh}){
  const [rooms,setRooms]=useState([]),[selected,setSelected]=useState(null),[members,setMembers]=useState([]),[profiles,setProfiles]=useState({}),[messages,setMessages]=useState([]),[requests,setRequests]=useState([])
  const [title,setTitle]=useState(''),[type,setType]=useState('public'),[password,setPassword]=useState(''),[joinPassword,setJoinPassword]=useState(''),[text,setText]=useState(''),[msg,setMsg]=useState(''),[target,setTarget]=useState(null),[gifts,setGifts]=useState([])
  async function loadRooms(){const [{data:r},{data:p},{data:g}]=await Promise.all([supabase.from('voice_rooms').select('*').eq('active',true).order('created_at',{ascending:false}),supabase.from('profiles').select('user_id,display_name,rank_name'),supabase.from('gift_catalog').select('*').eq('active',true)]);setRooms(r||[]);setProfiles(asMap(p));setGifts(g||[])}
  async function loadRoom(room=selected){if(!room)return;const [{data:m},{data:rm},{data:req}]=await Promise.all([supabase.from('voice_room_members').select('*').eq('room_id',room.id).is('left_at',null),supabase.from('voice_room_messages').select('*').eq('room_id',room.id).order('created_at').limit(200),supabase.from('voice_speaker_requests').select('*').eq('room_id',room.id).eq('status','pending').order('created_at')]);setMembers(m||[]);setMessages(rm||[]);setRequests(req||[])}
  useEffect(()=>{loadRooms()},[])
  useEffect(()=>{if(!selected)return;loadRoom(selected);const ch=supabase.channel(`room-${selected.id}`).on('postgres_changes',{event:'*',schema:'public',table:'voice_room_members',filter:`room_id=eq.${selected.id}`},()=>loadRoom(selected)).on('postgres_changes',{event:'INSERT',schema:'public',table:'voice_room_messages',filter:`room_id=eq.${selected.id}`},()=>loadRoom(selected)).on('postgres_changes',{event:'*',schema:'public',table:'voice_speaker_requests',filter:`room_id=eq.${selected.id}`},()=>loadRoom(selected)).subscribe();const timer=setInterval(async()=>{const {data}=await supabase.rpc('claim_voice_time_reward',{p_room_id:selected.id});if(data>0){setMsg(`+${data} 💎 pelo tempo na sala`);onWalletRefresh?.()}},60000);return()=>{clearInterval(timer);supabase.removeChannel(ch)}},[selected?.id])
  async function createRoom(){if(!title.trim())return;const {data,error}=await supabase.rpc('create_voice_room',{p_title:title.trim(),p_room_type:type,p_password:password||null,p_clan_id:null});if(error)return setMsg(error.message);setTitle('');setPassword('');await loadRooms();const {data:r}=await supabase.from('voice_rooms').select('*').eq('id',data).single();setSelected(r)}
  async function join(room){const {error}=await supabase.rpc('join_voice_room',{p_room_id:room.id,p_password:joinPassword||null});if(error)return setMsg(error.message);setSelected(room);setJoinPassword('')}
  async function requestSeat(){const {error}=await supabase.rpc('request_voice_seat',{p_room_id:selected.id});setMsg(error?error.message:'Pedido enviado ao criador da sala.');if(!error)loadRoom()}
  async function decide(id,ok){const {error}=await supabase.rpc('decide_voice_seat_request',{p_request_id:id,p_approve:ok});setMsg(error?error.message:(ok?'Pedido aprovado.':'Pedido recusado.'));if(!error)loadRoom()}
  async function removeSpeaker(uid,kick=false){const {error}=await supabase.rpc('remove_voice_speaker',{p_room_id:selected.id,p_user_id:uid,p_kick:kick});setMsg(error?error.message:(kick?'Pessoa removida da sala.':'Pessoa voltou para espectador.'));if(!error)loadRoom()}
  async function send(){if(!text.trim())return;const {error}=await supabase.from('voice_room_messages').insert({room_id:selected.id,sender_id:userId,body:text.trim()});if(error)setMsg(error.message);else setText('')}
  async function like(uid){const {error}=await supabase.from('voice_room_likes').insert({room_id:selected.id,sender_id:userId,receiver_id:uid});if(error)setMsg(error.message);else setMsg('❤️ Like enviado.')}
  async function gift(uid,giftId){const {error}=await supabase.rpc('send_gift',{p_receiver:uid,p_gift_id:giftId,p_room_id:selected.id});setMsg(error?error.message:'🎁 Presente enviado.');if(!error)onWalletRefresh?.()}
  const isOwner=selected?.owner_id===userId
  if(selected){const seats=Array.from({length:12},(_,i)=>members.find(m=>m.seat_number===i+1));const spectators=members.filter(m=>!m.seat_number);return <FeaturePanel title={selected.title} subtitle={`${selected.room_type==='public'?'Sala pública':selected.room_type==='private'?'Sala privada':'Sala do clã'} • ID ${selected.room_code}`} action={<button className="mini-btn" onClick={()=>setSelected(null)}>Sair da tela</button>}>
    <div className="reward-note">🎤 palco: +50 💎/10 min • 👀 espectador: +20 💎/10 min • ❤️ 100 likes recebidos: +50 💎</div>{msg&&<p className="notice">{msg}</p>}
    <div className="voice-seats">{seats.map((m,i)=><button className={`seat ${m?'occupied':''}`} key={i} onClick={()=>m&&setTarget(m.user_id)}>{m?<><div className="avatar">{(profiles[m.user_id]?.display_name||'?').slice(0,1)}</div><b>{profiles[m.user_id]?.display_name||'Usuário'}</b><span>{m.member_role}</span></>:<><Mic/><span>Lugar {i+1}</span></>}</button>)}</div>
    {!members.some(m=>m.user_id===userId&&m.seat_number)&&<button className="primary-button full" onClick={requestSeat}><Mic size={18}/> Pedir para subir</button>}
    {isOwner&&requests.length>0&&<div className="request-box"><h3>Pedidos para subir</h3>{requests.map(r=><div key={r.id}><span>{profiles[r.user_id]?.display_name||'Usuário'}</span><button onClick={()=>decide(r.id,true)}>Permitir</button><button onClick={()=>decide(r.id,false)}>Recusar</button></div>)}</div>}
    <div className="room-layout"><div><h3>Espectadores ({spectators.length})</h3><div className="spectator-list">{spectators.map(m=><button key={m.user_id} onClick={()=>setTarget(m.user_id)}><div className="avatar">{(profiles[m.user_id]?.display_name||'?').slice(0,1)}</div>{profiles[m.user_id]?.display_name||'Usuário'}</button>)}</div></div><div><h3>Chat da sala</h3><div className="room-chat">{messages.slice(-40).map(m=><p key={m.id}><b>{profiles[m.sender_id]?.display_name||'Usuário'}:</b> {m.body}</p>)}</div><div className="inline-composer"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Mensagem para a sala"/><button onClick={send}><Send size={17}/></button></div></div></div>
    {target&&target!==userId&&<div className="person-sheet"><div><strong>{profiles[target]?.display_name||'Usuário'}</strong><span>{profiles[target]?.rank_name||''}</span></div><button onClick={()=>like(target)}><Heart size={17}/> Like</button>{gifts.slice(0,5).map(g=><button key={g.id} onClick={()=>gift(target,g.id)}>{g.emoji} {g.name}</button>)}<button><UserPlus size={17}/> Adicionar amigo</button><button><MessageCircle size={17}/> Mensagem</button>{isOwner&&members.find(m=>m.user_id===target)?.seat_number&&<button onClick={()=>removeSpeaker(target,false)}>Tirar do palco</button>}{isOwner&&<button onClick={()=>removeSpeaker(target,true)}>Expulsar</button>}<button onClick={()=>setTarget(null)}>Fechar</button></div>}
    <div className="quiz-card"><Star/><div><b>Quiz coletivo da sala</b><span>Todos participam: palco e espectadores, sem limite de participantes.</span></div></div>
  </FeaturePanel>}
  return <FeaturePanel title="Salas de Voz" subtitle="Públicas, privadas e de clã • 12 lugares de voz + espectadores">
    <div className="room-create"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nome da sala"/><select value={type} onChange={e=>setType(e.target.value)}><option value="public">Pública</option><option value="private">Privada</option><option value="clan">Clã</option></select>{type==='private'&&<input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha da sala" type="password"/>}<button onClick={createRoom}><Plus size={17}/> Criar sala</button></div>
    {msg&&<p className="notice">{msg}</p>}<div className="room-list">{rooms.map(r=><div className="room-card" key={r.id}><div><Radio/><strong>{r.title}</strong><span>{r.room_type} • ID {r.room_code}</span></div>{r.room_type==='private'&&<input type="password" value={joinPassword} onChange={e=>setJoinPassword(e.target.value)} placeholder="Senha"/>}<button onClick={()=>join(r)}>Entrar</button></div>)}</div>
  </FeaturePanel>
}

export function PassPage({premium=false}){
  const [passes,setPasses]=useState([])
  useEffect(()=>{supabase.from('passes').select('*').eq('active',true).then(({data})=>setPasses(data||[]))},[])
  const pass=passes.find(x=>x.premium===premium)
  const rewards=premium?['Moldura premium','Diamantes extras','Efeito de entrada','Badge exclusivo','Presentes raros']:['Moedas','Stickers','Emojis','Bônus de missão','Itens comuns']
  return <FeaturePanel title={premium?'Passe Premium':'Passe PAI'} subtitle={pass?.metadata?.description||'Trilha de recompensas do PAI'}><div className={`pass-hero ${premium?'premium':''}`}><Ticket size={42}/><div><span>Temporada atual</span><h3>{premium?'Passe Premium':'Passe gratuito'}</h3><p>Complete missões, acumule XP e avance de nível.</p></div></div><div className="pass-track">{Array.from({length:10},(_,i)=><div key={i}><span>Nível {i+1}</span><b>{rewards[i%rewards.length]}</b><em>{premium?'⭐ Premium':'🎁 Grátis'}</em></div>)}</div>{premium&&<p className="notice">A tela premium já está no projeto. A compra com dinheiro real continua desativada até você liberar no painel.</p>}</FeaturePanel>
}

export function SettingsPage({userId}){
  const [settings,setSettings]=useState({public_room_notifications:true,message_notifications:true,status_notifications:true}),[msg,setMsg]=useState('')
  useEffect(()=>{supabase.from('user_settings').select('*').eq('user_id',userId).maybeSingle().then(({data})=>{if(data)setSettings(data)})},[userId])
  async function save(next){setSettings(next);const {error}=await supabase.from('user_settings').upsert({user_id:userId,...next,updated_at:new Date().toISOString()},{onConflict:'user_id'});setMsg(error?error.message:'Configurações salvas.')}
  const item=(key,label,desc)=><label className="setting-row"><div><strong>{label}</strong><span>{desc}</span></div><input type="checkbox" checked={!!settings[key]} onChange={e=>save({...settings,[key]:e.target.checked})}/></label>
  return <FeaturePanel title="Configurações" subtitle="Privacidade, notificações e preferências"><div className="settings-list">{item('public_room_notifications','Salas públicas','Avisar quando uma nova sala pública for aberta.')}{item('message_notifications','Mensagens','Notificações de conversas e grupos.')}{item('status_notifications','Status','Avisos relacionados a Status.')}</div>{msg&&<p className="notice">{msg}</p>}<div className="settings-section"><Settings/><div><b>Conta e segurança</b><span>Sessão, senha, bloqueios e controles de privacidade ficam centralizados aqui.</span></div></div></FeaturePanel>
}

export function NotificationsPage({userId}){
  const [rows,setRows]=useState([])
  async function load(){const {data}=await supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(100);setRows(data||[])}
  useEffect(()=>{load()},[userId])
  async function open(n){if(!n.read_at)await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id);load()}
  return <FeaturePanel title="Notificações" subtitle="Salas públicas, mensagens, eventos e recompensas"><div className="notification-list">{rows.length?rows.map(n=><button key={n.id} className={n.read_at?'':'unread-note'} onClick={()=>open(n)}><Bell/><div><strong>{n.title}</strong><span>{n.body}</span><small>{new Date(n.created_at).toLocaleString('pt-BR')}</small></div></button>):<p className="muted">Nenhuma notificação ainda.</p>}</div></FeaturePanel>
}

export function AdminRewardsPanel(){
  const [rows,setRows]=useState([]),[drafts,setDrafts]=useState({}),[msg,setMsg]=useState('')
  async function load(){const {data}=await supabase.from('reward_settings').select('*').order('key');setRows(data||[])}
  useEffect(()=>{load()},[])
  async function save(r){const value=Number(drafts[r.key]??r.value_num);const {error}=await supabase.rpc('admin_set_reward_setting',{p_key:r.key,p_value:Number.isFinite(value)?Math.max(0,Math.floor(value)):0,p_enabled:r.enabled});setMsg(error?error.message:'Recompensa atualizada.');if(!error){setDrafts(d=>{const n={...d};delete n[r.key];return n});load()}}
  const groups={Salas:['voice_','room_'],Fotos:['photo_'],Status:['status_']}
  return <div className="admin-rewards"><h3>Gerenciamento de recompensas</h3><p className="muted">Somente o OWNER altera estes valores. Criadores de sala não podem editar recompensas.</p>{Object.entries(groups).map(([label,prefixes])=><section key={label}><h4>{label}</h4>{rows.filter(r=>prefixes.some(p=>r.key.startsWith(p))).map(r=><div className="reward-setting" key={r.key}><div><strong>{r.key}</strong><span>{r.description}</span></div><input type="number" min="0" value={drafts[r.key]??r.value_num} onChange={e=>setDrafts(d=>({...d,[r.key]:e.target.value}))}/><button onClick={()=>save(r)}>Salvar</button></div>)}</section>)}{msg&&<p className="notice">{msg}</p>}</div>
}
