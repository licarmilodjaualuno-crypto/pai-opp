import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Backpack, Camera, Crown, Gift, Image as ImageIcon, MoreVertical, Pencil, Plus, QrCode, Settings, Share2, Target, Trophy, UserPlus, Users, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './profileplus.css'
import './profile-screen.css'

async function upload(file,uid,kind){
  if(!file)return null
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase()
  const path=`${uid}/${kind}-${Date.now()}.${ext}`
  const{error}=await supabase.storage.from('pai-social').upload(path,file,{upsert:false})
  if(error)throw error
  return supabase.storage.from('pai-social').getPublicUrl(path).data.publicUrl
}

function fmt(n){return Number(n||0).toLocaleString('pt-BR')}

export default function ProfilePlus(){
  const[session,setSession]=useState(null),[host,setHost]=useState(null),[editOpen,setEditOpen]=useState(false)
  const[profile,setProfile]=useState(null),[wallet,setWallet]=useState(null),[ranks,setRanks]=useState([])
  const[followers,setFollowers]=useState(0),[following,setFollowing]=useState(0),[groups,setGroups]=useState(0),[clan,setClan]=useState(null),[photos,setPhotos]=useState([])
  const[avatar,setAvatar]=useState(null),[cover,setCover]=useState(null),[name,setName]=useState(''),[bio,setBio]=useState(''),[msg,setMsg]=useState('')

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)load(data.session.user.id)})
    const{data:l}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s)load(s.user.id)})
    return()=>l.subscription.unsubscribe()
  },[])

  useEffect(()=>{
    const sync=()=>{
      const cards=[...document.querySelectorAll('.content-card')]
      const found=cards.find(card=>card.querySelector('.section-heading h2')?.textContent?.trim()==='Perfil')||null
      if(found){found.classList.add('pai-profile-host');setHost(found)}else setHost(null)
    }
    sync()
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>observer.disconnect()
  },[])

  async function load(uid){
    const [p,w,r,fr,fg,cm,cl,ph]=await Promise.all([
      supabase.from('profiles').select('*').eq('user_id',uid).single(),
      supabase.from('wallets').select('*').eq('user_id',uid).maybeSingle(),
      supabase.from('ranks').select('*').order('level'),
      supabase.from('follows').select('*',{count:'exact',head:true}).eq('following_id',uid),
      supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',uid),
      supabase.from('conversation_members').select('conversation_id').eq('user_id',uid),
      supabase.from('clan_members').select('clan_id,clans(name)').eq('user_id',uid).maybeSingle(),
      supabase.from('posts').select('id,image_url,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(5)
    ])
    setProfile(p.data);setWallet(w.data);setRanks(r.data||[]);setFollowers(fr.count||0);setFollowing(fg.count||0)
    setGroups((cm.data||[]).length);setClan(cl.data?.clans||null);setPhotos(ph.data||[])
    setName(p.data?.display_name||'');setBio(p.data?.bio||'')
  }

  const rankInfo=useMemo(()=>{
    const points=Number(profile?.points||0)
    const currentIndex=Math.max(0,ranks.findIndex(r=>r.name===profile?.rank_name))
    const current=ranks[currentIndex]||{name:profile?.rank_name||'Bronze 1',min_points:0}
    const next=ranks[currentIndex+1]
    const start=Number(current.min_points||0),end=next?Number(next.min_points||start+1):Math.max(points, start+1)
    const pct=next?Math.max(0,Math.min(100,((points-start)/(end-start))*100)):100
    return{current,next,pct,missing:next?Math.max(0,end-points):0}
  },[profile?.points,profile?.rank_name,ranks])

  function go(label){
    const old=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim().includes(label))
    if(old)old.click()
  }

  async function saveProfile(){
    if(!session)return
    try{
      const patch={display_name:name.trim()||profile?.display_name,bio:bio.trim()}
      if(avatar)patch.avatar_url=await upload(avatar,session.user.id,'avatar')
      if(cover)patch.cover_url=await upload(cover,session.user.id,'cover')
      const{error}=await supabase.from('profiles').update(patch).eq('user_id',session.user.id)
      if(error)throw error
      setAvatar(null);setCover(null);setMsg('Perfil atualizado.');await load(session.user.id)
    }catch(e){setMsg(e.message||'Não foi possível atualizar o perfil.')}
  }

  if(!session||!host||!profile)return null

  const screen=<div className="pai-profile-screen">
    <div className="pai-profile-topbar">
      <button className="icon-btn" onClick={()=>document.querySelector('.bottom-nav button')?.click()}><ArrowLeft/></button>
      <div className="pai-brand"><Crown/><b>PAI</b><span></span><strong>Meu Perfil</strong></div>
      <div className="pai-profile-actions"><button className="icon-btn"><Share2/></button><button className="icon-btn"><QrCode/></button><button className="icon-btn"><MoreVertical/></button></div>
    </div>

    <div className="pai-profile-hero">
      <div className="pai-cover" style={profile.cover_url?{backgroundImage:`linear-gradient(90deg,rgba(4,8,24,.18),rgba(4,8,24,.35)),url(${profile.cover_url})`}:undefined}>
        {!profile.cover_url&&<div className="pai-cover-fallback"><span>PAI</span><Crown/></div>}
      </div>
      <div className="pai-identity-row">
        <div className="pai-avatar-ring">{profile.avatar_url?<img src={profile.avatar_url} alt="Avatar"/>:<div className="pai-avatar-fallback">{(profile.display_name||'?').slice(0,1)}</div>}<i/></div>
        <div className="pai-identity"><div className="pai-name-line"><span className="pai-rank-mini">♛</span><h1>{profile.display_name||'PlayerPAI'}</h1><button onClick={()=>setEditOpen(true)}><Pencil/></button></div><p>{profile.bio||'Gamer, competitivo e sempre no PAI! 🎮🔥'}</p></div>
      </div>
    </div>

    <section className="pai-rank-card">
      <div className="pai-rank-emblem"><div className="diamond-shape">◆</div><small>{rankInfo.current?.name?.split(' ').pop()||'I'}</small></div>
      <div className="pai-rank-info"><div className="rank-title">{rankInfo.current?.name||profile.rank_name}</div><div className="rank-points">✦ <b>{fmt(profile.points)} pts</b></div><div className="rank-progress"><span style={{width:`${rankInfo.pct}%`}}/></div><p>{rankInfo.next?`Faltam ${fmt(rankInfo.missing)} pts para ${rankInfo.next.name}`:'Patente máxima alcançada'}</p></div>
      <button className="rank-info-btn">i</button>
    </section>

    <section className="pai-social-stats">
      <div><Users/><b>{fmt(followers)}</b><span>Seguidores</span></div>
      <div><UserPlus/><b>{fmt(following)}</b><span>Seguindo</span></div>
      <div><Users/><b>{fmt(groups)}</b><span>Grupos</span></div>
      <div><div className="clan-shield">♛</div><b>{clan?.name||'Clã PAI'}</b><span>{clan?'Membro':'Sem clã'}</span></div>
    </section>

    <section className="pai-wallet-row">
      <button className="wallet-card coin"><span className="wallet-icon">P</span><div><b>{fmt(wallet?.coins)}</b><small>Moedas</small></div><Plus/></button>
      <button className="wallet-card gem"><span className="wallet-icon">◆</span><div><b>{fmt(wallet?.diamonds)}</b><small>Diamantes</small></div><Plus/></button>
    </section>

    <section className="pai-profile-shortcuts">
      <button><Backpack/><b>Inventário</b></button>
      <button><Trophy/><b>Conquistas</b></button>
      <button><Target/><b>Missões</b></button>
    </section>

    <section className="pai-profile-wide-actions">
      <button onClick={()=>setEditOpen(true)}><Pencil/> Editar perfil</button>
      <button onClick={()=>go('Configurações')}><Settings/> Configurações</button>
    </section>

    <section className="pai-photo-strip">
      <header><div><ImageIcon/><h2>Minhas Fotos</h2></div><span>Até 5 fotos ({photos.length}/5) ›</span></header>
      <div className="pai-photo-grid">
        {photos.map(p=><button key={p.id} className="pai-photo-thumb" onClick={()=>go('Fotos')}><img src={p.image_url} alt="Foto do perfil"/></button>)}
        {Array.from({length:Math.max(0,5-photos.length)},(_,i)=><button key={`empty-${i}`} className="pai-photo-empty" onClick={()=>go('Fotos')}><Plus/></button>)}
      </div>
    </section>

    {editOpen&&<div className="pai-edit-overlay"><div className="pai-edit-modal"><header><div><small>PERFIL PAI</small><h2>Editar perfil</h2></div><button onClick={()=>setEditOpen(false)}><X/></button></header>{msg&&<p className="notice">{msg}</p>}<label>Nome<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={160}/></label><label className="file-line"><Camera/> Foto do perfil<input type="file" accept="image/*" onChange={e=>setAvatar(e.target.files?.[0]||null)}/></label><label className="file-line"><ImageIcon/> Foto de capa<input type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)}/></label><button className="save-profile" onClick={saveProfile}>Salvar alterações</button></div></div>}
  </div>

  return createPortal(screen,host)
}
