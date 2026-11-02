import { useEffect, useMemo, useState } from 'react'
import { Star, X, Save } from 'lucide-react'
import { supabase } from './lib/supabase'

const LABELS={
  points_daily_login:'Login diário',
  points_daily_reward:'Recompensa diária',
  points_post_publish:'Publicar foto',
  points_post_like_received:'Receber curtida válida',
  points_post_comment_received:'Receber primeiro comentário válido',
  points_conversation_participation:'Participar de conversa',
  points_quiz_correct:'Resposta correta no quiz',
  points_tic_tac_toe_win:'Vitória no Jogo da Velha',
  points_connect_four_win:'Vitória no Quatro em Linha',
  points_quiz_win:'Vitória no Quiz',
  points_memory_win:'Vitória no Jogo da Memória',
  points_chat_60min:'1 hora em sala/conversa ao vivo',
  points_chat_90min:'1h30 em sala/conversa ao vivo',
}

export default function PointsCenter(){
  const[open,setOpen]=useState(false),[session,setSession]=useState(null),[rows,setRows]=useState([]),[history,setHistory]=useState([]),[role,setRole]=useState('user'),[drafts,setDrafts]=useState({}),[msg,setMsg]=useState('')
  async function load(s=session){
    if(!s?.user?.id)return
    const uid=s.user.id
    const [{data:r},{data:h},{data:ur}]=await Promise.all([
      supabase.from('reward_settings').select('*').like('key','points_%').order('key'),
      supabase.from('points_ledger').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(50),
      supabase.from('user_roles').select('role').eq('user_id',uid).single(),
    ])
    setRows(r||[]);setHistory(h||[]);setRole(ur?.role||'user')
  }
  useEffect(()=>{
    let mounted=true
    supabase.auth.getSession().then(async({data})=>{
      if(!mounted)return
      setSession(data.session)
      if(data.session){await supabase.rpc('claim_daily_login_points');await load(data.session)}
    })
    const{data:l}=supabase.auth.onAuthStateChange(async(_e,s)=>{setSession(s);if(s){await supabase.rpc('claim_daily_login_points');await load(s)}})
    return()=>{mounted=false;l.subscription.unsubscribe()}
  },[])
  const totalToday=useMemo(()=>{const today=new Date().toLocaleDateString('en-CA');return history.filter(x=>String(x.created_at||'').slice(0,10)===today).reduce((a,b)=>a+(b.delta||0),0)},[history])
  async function save(r){const value=Math.max(0,Math.floor(Number(drafts[r.key]??r.value_num)||0));const{error}=await supabase.rpc('admin_set_reward_setting',{p_key:r.key,p_value:value,p_enabled:r.enabled});setMsg(error?error.message:'Valor de pontos atualizado.');if(!error){setDrafts(d=>{const n={...d};delete n[r.key];return n});load()}}
  if(!session)return null
  return <>
    <button className="points-fab" onClick={()=>{setOpen(true);load()}}><Star size={18}/> Pontos</button>
    {open&&<div className="points-overlay"><div className="points-sheet"><div className="points-head"><div><span className="points-kicker">PAI</span><h2>Pontos diários e recompensas</h2><p>Veja como subir de patente e quanto cada atividade vale.</p></div><button onClick={()=>setOpen(false)}><X/></button></div>
      <div className="points-summary"><div><span>Ganhos hoje</span><strong>+{totalToday.toLocaleString('pt-BR')} pts</strong></div><div><span>Marco especial</span><strong>1h30 = 1.000 pts</strong></div></div>
      <div className="points-grid">{rows.map(r=><div className="point-rule" key={r.key}><div><b>{LABELS[r.key]||r.key}</b><span>{r.description}</span></div><strong>+{Number(r.value_num||0).toLocaleString('pt-BR')} pts</strong></div>)}</div>
      <h3>Últimos pontos recebidos</h3><div className="point-history">{history.length?history.slice(0,12).map(h=><div key={h.id}><span>{h.source.replaceAll('_',' ')}</span><b>+{Number(h.delta||0).toLocaleString('pt-BR')}</b></div>):<p className="muted">Você ainda não recebeu pontos.</p>}</div>
      {role==='owner'&&<div className="points-admin"><h3>Painel OWNER — editar pontos</h3><p className="muted">Somente você pode mudar estes valores.</p>{rows.map(r=><div className="point-edit" key={r.key}><span>{LABELS[r.key]||r.key}</span><input type="number" min="0" value={drafts[r.key]??r.value_num} onChange={e=>setDrafts(d=>({...d,[r.key]:e.target.value}))}/><button onClick={()=>save(r)}><Save size={16}/> Salvar</button></div>)}{msg&&<p className="notice">{msg}</p>}</div>}
    </div></div>}
  </>
}
