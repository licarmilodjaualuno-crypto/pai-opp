import {useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {UserPlus,UserCheck,Eye,Image as ImageIcon,Users,Trophy,X} from 'lucide-react'
import {supabase} from './lib/supabase'
import './ranking-social.css'

const fmt=n=>Number(n||0).toLocaleString('pt-BR')
function Avatar({p,size='md'}){return <div className={`rso-avatar ${size}`}>{p?.avatar_url?<img src={p.avatar_url} alt=""/>:(p?.display_name||'?').slice(0,1).toUpperCase()}</div>}

export default function RankingSocialOverlay(){
 const[visible,setVisible]=useState(false),[userId,setUserId]=useState(null),[tab,setTab]=useState('global'),[rows,setRows]=useState([]),[selected,setSelected]=useState(null),[mode,setMode]=useState(null),[posts,setPosts]=useState([]),[social,setSocial]=useState({following:false,friend:'none',followers:0,followingCount:0}),[msg,setMsg]=useState('')
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setUserId(data.session?.user?.id||null));const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUserId(s?.user?.id||null));return()=>subscription.unsubscribe()},[])
 useEffect(()=>{const scan=()=>{const h=[...document.querySelectorAll('.ra-title-row h1')].find(x=>x.textContent?.includes('Ranking'));setVisible(!!h&&!!h.offsetParent)};scan();const mo=new MutationObserver(scan);mo.observe(document.body,{childList:true,subtree:true,attributes:true});return()=>mo.disconnect()},[])
 useEffect(()=>{if(visible&&userId)load(tab)},[visible,userId,tab])
 useEffect(()=>{if(!selected||!userId)return;loadSelected(selected.user_id)},[selected?.user_id,userId])
 async function load(which){setMsg('');if(which==='global'){const{data,error}=await supabase.from('profiles').select('user_id,display_name,username,rank_name,points,avatar_url,bio,cover_url').order('points',{ascending:false}).limit(50);if(error)setMsg(error.message);setRows(data||[]);return}
  if(which==='friends'){const{data:f}=await supabase.from('friendships').select('requester_id,addressee_id').eq('status','accepted').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);const ids=(f||[]).map(x=>x.requester_id===userId?x.addressee_id:x.requester_id);if(!ids.length){setRows([]);return}const{data}=await supabase.from('profiles').select('user_id,display_name,username,rank_name,points,avatar_url,bio,cover_url').in('user_id',ids).order('points',{ascending:false});setRows(data||[]);return}
  const{data}=await supabase.from('clans').select('id,name,tag,points,rank_name,owner_id').order('points',{ascending:false}).limit(50);setRows((data||[]).map(c=>({...c,user_id:null,display_name:c.name,username:c.tag,avatar_url:null,clan:true}))) }
 async function loadSelected(id){const[{data:follows},{data:friendships},{count:followers},{count:followingCount},{data:ps}]=await Promise.all([
   supabase.from('follows').select('following_id').eq('follower_id',userId).eq('following_id',id),
   supabase.from('friendships').select('requester_id,addressee_id,status').or(`and(requester_id.eq.${userId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${userId})`),
   supabase.from('follows').select('*',{count:'exact',head:true}).eq('following_id',id),
   supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',id),
   supabase.from('posts').select('id,image_url,caption,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(30)
  ]);const fr=(friendships||[])[0];setSocial({following:(follows||[]).length>0,friend:fr?.status||'none',followers:followers||0,followingCount:followingCount||0});setPosts(ps||[])}
 async function toggleFollow(){if(!selected)return;const{data,error}=await supabase.rpc('toggle_follow',{p_user_id:selected.user_id});if(error)return setMsg(error.message);setSocial(s=>({...s,following:!!data,followers:Math.max(0,s.followers+(data?1:-1))}));setMsg(data?'Agora você está seguindo este usuário.':'Você deixou de seguir este usuário.')}
 async function addFriend(){if(!selected)return;const{data,error}=await supabase.rpc('request_friend',{p_user_id:selected.user_id});if(error)return setMsg(error.message);setSocial(s=>({...s,friend:data||'pending'}));setMsg(data==='accepted'?'Agora vocês são amigos.':'Pedido de amizade enviado.')}
 function openUser(p){if(p.clan||p.user_id===userId)return;setSelected(p);setMode('actions');setMsg('')}
 const title=useMemo(()=>tab==='global'?'Global':tab==='friends'?'Amigos':'Clãs',[tab])
 if(!visible)return null
 return createPortal(<div className="rso-root">
   <div className="rso-head"><h1><Trophy/> Ranking</h1><span>{title}</span></div>
   <div className="rso-tabs"><button className={tab==='global'?'active':''} onClick={()=>setTab('global')}>Global</button><button className={tab==='friends'?'active':''} onClick={()=>setTab('friends')}>Amigos</button><button className={tab==='clans'?'active':''} onClick={()=>setTab('clans')}>Clãs</button></div>
   {msg&&<div className="rso-msg">{msg}</div>}
   <div className="rso-list">{rows.length?rows.map((r,i)=><button key={r.id||r.user_id} className={r.user_id===userId?'me':''} onClick={()=>openUser(r)}><b className="rso-pos">{i<3?['🥇','🥈','🥉'][i]:i+1}</b><Avatar p={r}/><div><strong>{r.display_name||'Usuário'}</strong><span>{r.clan?`#${r.username||''}`:r.rank_name||'Sem patente'}</span></div><em>{fmt(r.points)} pts</em></button>):<div className="rso-empty"><Users/><h3>{tab==='friends'?'Você ainda não tem amigos no ranking':tab==='clans'?'Nenhum clã encontrado':'Nenhum usuário encontrado'}</h3></div>}</div>
   {selected&&mode&&<div className="rso-modal" onClick={e=>{if(e.target===e.currentTarget){setSelected(null);setMode(null)}}}><div className="rso-card"><button className="rso-close" onClick={()=>{setSelected(null);setMode(null)}}><X/></button>
      {mode==='actions'&&<><Avatar p={selected} size="xl"/><h2>{selected.display_name}</h2><p>@{selected.username||'usuario'} • {selected.rank_name||'Sem patente'}</p><div className="rso-actions"><button onClick={()=>setMode('profile')}><Eye/> Visualizar perfil</button><button onClick={()=>setMode('avatar')}><ImageIcon/> Visualizar foto de perfil</button><button onClick={addFriend} disabled={social.friend==='accepted'||social.friend==='pending'}><UserPlus/> {social.friend==='accepted'?'Já é amigo':social.friend==='pending'?'Pedido enviado':'Adicionar amigo'}</button><button onClick={toggleFollow}>{social.following?<UserCheck/>:<UserPlus/>}{social.following?'Seguindo':'Seguir usuário'}</button><button onClick={()=>setMode('posts')}><ImageIcon/> Ver postagens</button></div></>}
      {mode==='avatar'&&<><h2>Foto de perfil</h2>{selected.avatar_url?<img className="rso-photo-big" src={selected.avatar_url} alt="Foto de perfil"/>:<Avatar p={selected} size="xl"/>}</>}
      {mode==='profile'&&<><div className="rso-cover" style={selected.cover_url?{backgroundImage:`url(${selected.cover_url})`}:{}}/><Avatar p={selected} size="xl"/><h2>{selected.display_name}</h2><p>{selected.bio||'Este usuário ainda não adicionou uma bio.'}</p><div className="rso-stats"><div><b>{social.followers}</b><span>Seguidores</span></div><div><b>{social.followingCount}</b><span>Seguindo</span></div><div><b>{fmt(selected.points)}</b><span>Pontos</span></div></div><div className="rso-actions"><button onClick={toggleFollow}>{social.following?'Deixar de seguir':'Seguir'}</button><button onClick={addFriend} disabled={social.friend==='accepted'||social.friend==='pending'}>{social.friend==='accepted'?'Amigos':social.friend==='pending'?'Pedido enviado':'Adicionar amigo'}</button><button onClick={()=>setMode('posts')}>Ver postagens</button></div></>}
      {mode==='posts'&&<><h2>Postagens de {selected.display_name}</h2><div className="rso-posts">{posts.length?posts.map(p=><article key={p.id}>{p.image_url&&<img src={p.image_url} alt="Postagem"/>}{p.caption&&<p>{p.caption}</p>}</article>):<p>Nenhuma postagem ainda.</p>}</div></>}
   </div></div>}
 </div>,document.body)
}
