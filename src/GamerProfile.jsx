import { useEffect, useState } from 'react'
import { ArrowLeft, Crown, Edit3, Gear, Image as ImageIcon, Package, Share2, Target, Trophy, Users, UserPlus, QrCode, MoreVertical, Plus } from 'lucide-react'
import { supabase } from './lib/supabase'
import './gamer-profile.css'
import './gamer-profile-compact.css'

function fmt(n){return Number(n||0).toLocaleString('pt-BR')}

export default function GamerProfile({account,wallet,onGo}){
  const [followers,setFollowers]=useState(0)
  const [following,setFollowing]=useState(0)
  const [groups,setGroups]=useState(0)
  const [photos,setPhotos]=useState([])
  const [clan,setClan]=useState(null)
  const [nextRank,setNextRank]=useState(null)

  useEffect(()=>{
    if(!account?.user_id)return
    const uid=account.user_id
    Promise.all([
      supabase.from('follows').select('*',{count:'exact',head:true}).eq('following_id',uid),
      supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',uid),
      supabase.from('conversation_members').select('*',{count:'exact',head:true}).eq('user_id',uid),
      supabase.from('posts').select('id,image_url').eq('user_id',uid).order('created_at',{ascending:false}).limit(5),
      supabase.from('clan_members').select('clan_id,clans(name,tag)').eq('user_id',uid).limit(1),
      supabase.from('ranks').select('name,min_points').gt('min_points',account.points||0).order('min_points').limit(1)
    ]).then(([a,b,c,d,e,f])=>{
      setFollowers(a.count||0);setFollowing(b.count||0);setGroups(c.count||0)
      setPhotos(d.data||[]);setClan(e.data?.[0]?.clans||null);setNextRank(f.data?.[0]||null)
    })
  },[account?.user_id,account?.points])

  const nextPoints=nextRank?.min_points||Math.max((account?.points||0)+1000,1000)
  const progress=Math.max(0,Math.min(100,((account?.points||0)/nextPoints)*100))
  const missing=Math.max(0,nextPoints-(account?.points||0))
  const displayName=account?.display_name||'PlayerPAI'
  const rank=account?.rank_name||'Bronze 1'

  return <main className="gp-screen">
    <section className="gp-phone">
      <div className="gp-topline">
        <button className="gp-icon" onClick={()=>onGo('home')}><ArrowLeft/></button>
        <div className="gp-brand"><Crown/><b>PAI</b><span></span><strong>Meu Perfil</strong></div>
        <div className="gp-actions"><button className="gp-icon"><Share2/></button><button className="gp-icon"><QrCode/></button><button className="gp-icon"><MoreVertical/></button></div>
      </div>

      <div className="gp-cover" style={account?.cover_url?{backgroundImage:`linear-gradient(180deg,rgba(8,10,26,.06),rgba(8,10,26,.88)),url(${account.cover_url})`}:undefined}>
        <div className="gp-cover-crown"><Crown/></div>
      </div>

      <div className="gp-identity">
        <div className="gp-avatar-wrap">
          <div className="gp-avatar">{account?.avatar_url?<img src={account.avatar_url} alt="Avatar"/>:<span>{displayName.slice(0,1).toUpperCase()}</span>}</div>
          <i></i>
        </div>
        <div className="gp-idtext"><div className="gp-name-line"><span className="gp-badge">♛</span><h1>{displayName}</h1><button onClick={()=>onGo('profile-edit')}><Edit3/></button></div><p>{account?.bio||'Gamer, competitivo e sempre no PAI! 🎮🔥'}</p></div>
      </div>

      <section className="gp-rank-card">
        <div className="gp-rank-emblem"><div className="gp-diamond">◆</div><small>{rank.replace(/\D/g,'')||'I'}</small></div>
        <div className="gp-rank-info"><h2>{rank}</h2><strong>✦ {fmt(account?.points)} pts</strong><div className="gp-progress"><span style={{width:`${progress}%`}}/></div><p>{missing?`Faltam ${fmt(missing)} pts para ${nextRank?.name||'a próxima patente'}`:'Patente máxima alcançada'}</p></div>
        <button className="gp-info">i</button>
      </section>

      <section className="gp-social-stats">
        <div><Users/><b>{fmt(followers)}</b><span>Seguidores</span></div>
        <div><UserPlus/><b>{fmt(following)}</b><span>Seguindo</span></div>
        <div><Users/><b>{fmt(groups)}</b><span>Grupos</span></div>
        <div><Crown/><b>{clan?.name||'Clã PAI'}</b><span>{clan?'Membro':'Sem clã'}</span></div>
      </section>

      <section className="gp-wallet-row">
        <div className="gp-wallet gp-coins"><div className="gp-coin">P</div><div><b>{fmt(wallet?.coins)}</b><span>Moedas</span></div><button onClick={()=>onGo('store')}><Plus/></button></div>
        <div className="gp-wallet gp-diamonds"><div className="gp-gem">◆</div><div><b>{fmt(wallet?.diamonds)}</b><span>Diamantes</span></div><button onClick={()=>onGo('store')}><Plus/></button></div>
      </section>

      <section className="gp-tiles">
        <button onClick={()=>onGo('store')}><Package/><span>Inventário</span></button>
        <button onClick={()=>onGo('ranking')}><Trophy/><span>Conquistas</span></button>
        <button onClick={()=>onGo('pass')}><Target/><span>Missões</span></button>
      </section>

      <section className="gp-wide-actions">
        <button onClick={()=>onGo('profile-edit')}><Edit3/>Editar perfil</button>
        <button onClick={()=>onGo('settings')}><Gear/>Configurações</button>
      </section>

      <section className="gp-photos">
        <div className="gp-photos-head"><div><ImageIcon/><h2>Minhas Fotos</h2></div><button onClick={()=>onGo('photos')}>Até 5 fotos ({photos.length}/5) ›</button></div>
        <div className="gp-photo-grid">{photos.map(p=><button className="gp-photo" key={p.id} onClick={()=>onGo('photos')}><img src={p.image_url} alt="Foto do perfil"/></button>)}{Array.from({length:Math.max(0,5-photos.length)}).map((_,i)=><button className="gp-photo gp-add" key={`add-${i}`} onClick={()=>onGo('photos')}><Plus/></button>)}</div>
      </section>
    </section>
  </main>
}
