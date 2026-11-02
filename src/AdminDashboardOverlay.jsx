import {useEffect,useMemo,useState} from 'react'
import {supabase} from './lib/supabase'
import './admin-dashboard-redesign.css'

const MENU=[
 ['overview','⌂','Visão Geral'],['store','🛒','Gerenciar Loja'],['users','👥','Usuários'],['ranks','✪','Patentes e Recompensas'],['events','▣','Eventos'],['gifts','🎁','Presentes e Códigos'],['reports','⚠','Denúncias e Punições'],['content','📣','Conteúdo e Anúncios'],['analytics','▥','Relatórios e Estatísticas'],['system','⚙','Configurações do Sistema'],['history','↶','Histórico de Ações']
]

function fmt(n){return Number(n||0).toLocaleString('pt-BR')}
function clickSide(label){const btn=[...document.querySelectorAll('.ra-side button')].find(b=>b.textContent?.includes(label));btn?.click()}
function addHistory(text){try{const old=JSON.parse(localStorage.getItem('pai_admin_history')||'[]');localStorage.setItem('pai_admin_history',JSON.stringify([{text,at:new Date().toISOString()},...old].slice(0,30)))}catch{}}

export default function AdminDashboardOverlay(){
 const[visible,setVisible]=useState(false),[section,setSection]=useState('overview'),[metrics,setMetrics]=useState({users:0,diamonds:0,coins:0,reports:0,items:0}),[msg,setMsg]=useState(''),[eventName,setEventName]=useState(''),[announcement,setAnnouncement]=useState(''),[code,setCode]=useState(''),[maintenance,setMaintenance]=useState(()=>localStorage.getItem('pai_admin_maintenance')==='1'),[history,setHistory]=useState([])

 useEffect(()=>{
  const check=()=>setVisible(!!document.querySelector('.ra-admin-grid'))
  check();const mo=new MutationObserver(check);mo.observe(document.body,{childList:true,subtree:true});return()=>mo.disconnect()
 },[])

 useEffect(()=>{if(!visible)return;loadMetrics();loadHistory()},[visible])

 async function loadMetrics(){
  const [{count:users},{data:wallets},{count:reports},{count:items}]=await Promise.all([
   supabase.from('profiles').select('*',{count:'exact',head:true}),
   supabase.from('wallets').select('coins,diamonds').limit(5000),
   supabase.from('reports').select('*',{count:'exact',head:true}).neq('status','resolved'),
   supabase.from('store_items').select('*',{count:'exact',head:true})
  ])
  const totals=(wallets||[]).reduce((a,w)=>({coins:a.coins+Number(w.coins||0),diamonds:a.diamonds+Number(w.diamonds||0)}),{coins:0,diamonds:0})
  setMetrics({users:users||0,coins:totals.coins,diamonds:totals.diamonds,reports:reports||0,items:items||0})
 }
 function loadHistory(){try{setHistory(JSON.parse(localStorage.getItem('pai_admin_history')||'[]'))}catch{setHistory([])}}
 function openOwner(){const b=document.querySelector('.ownerplus-fab');if(b){b.click();setMsg('Abrindo moderação avançada.')}else setMsg('A moderação avançada está disponível apenas para a conta OWNER.')}
 function saveEvent(){if(!eventName.trim())return setMsg('Digite um nome para o evento.');const e={name:eventName.trim(),createdAt:new Date().toISOString(),status:'rascunho'};const old=JSON.parse(localStorage.getItem('pai_admin_event_drafts')||'[]');localStorage.setItem('pai_admin_event_drafts',JSON.stringify([e,...old]));addHistory(`Rascunho de evento criado: ${e.name}`);setEventName('');setMsg('Rascunho do evento salvo neste dispositivo.');loadHistory()}
 function generateCode(){const v='PAI-'+Math.random().toString(36).slice(2,8).toUpperCase();setCode(v);addHistory(`Código administrativo de rascunho gerado: ${v}`);loadHistory()}
 async function copyCode(){if(!code)return;await navigator.clipboard?.writeText(code);setMsg('Código copiado. Ele é apenas um rascunho até o sistema de resgate ser conectado.')}
 function saveAnnouncement(){if(!announcement.trim())return setMsg('Digite o aviso primeiro.');localStorage.setItem('pai_admin_announcement_draft',announcement.trim());addHistory('Rascunho de aviso global salvo');setMsg('Rascunho do aviso global salvo neste dispositivo.');loadHistory()}
 function toggleMaintenance(){const next=!maintenance;setMaintenance(next);localStorage.setItem('pai_admin_maintenance',next?'1':'0');addHistory(`Modo manutenção ${next?'ativado':'desativado'} como preferência local`);loadHistory()}
 function exit(){setVisible(false);clickSide('Início')}

 const title=useMemo(()=>MENU.find(x=>x[0]===section)?.[2]||'Visão Geral',[section])
 if(!visible)return null

 return <div className="adr-root">
  <header className="adr-top"><div className="adr-logo">♛ <b>PAI</b></div><div><h1>🛡 Painel do Administrador <span>Acesso Restrito</span></h1><p>Gerencie o PAI, usuários, loja, eventos e recursos da plataforma.</p></div><div className="adr-admin"><b>👑 Administrador</b><small>● Online</small></div></header>
  <aside className="adr-side">{MENU.map(([id,ic,label])=><button key={id} className={section===id?'active':''} onClick={()=>{setSection(id);setMsg('')}}><span>{ic}</span>{label}</button>)}<button className="adr-exit" onClick={exit}>↪ Sair do Painel</button></aside>
  <main className="adr-main">
   <div className="adr-mobile-title"><h2>{title}</h2><button onClick={exit}>✕</button></div>
   {msg&&<div className="adr-message">{msg}</div>}
   {section==='overview'&&<>
    <section className="adr-metrics"><article><span>👥</span><div><small>Usuários Totais</small><b>{fmt(metrics.users)}</b></div></article><article><span>💎</span><div><small>Diamantes em Circulação</small><b>{fmt(metrics.diamonds)}</b></div></article><article><span>🪙</span><div><small>Moedas em Circulação</small><b>{fmt(metrics.coins)}</b></div></article><article><span>⚠</span><div><small>Denúncias Pendentes</small><b>{fmt(metrics.reports)}</b></div></article></section>
    <section className="adr-hero-grid"><div className="adr-activity"><h3>Visão Geral da Plataforma</h3><div className="adr-big-number">{fmt(metrics.users)} <span>usuários</span></div><p>{fmt(metrics.items)} itens cadastrados na loja • {fmt(metrics.reports)} denúncias pendentes</p><button onClick={loadMetrics}>↻ Atualizar dados</button></div><div className="adr-quick"><h3>Ações Rápidas</h3><button onClick={()=>setSection('store')}>＋ Gerenciar Loja</button><button onClick={()=>setSection('events')}>▣ Criar Evento</button><button onClick={()=>setSection('gifts')}>🎁 Gerar Código</button><button onClick={()=>setSection('content')}>📣 Aviso Global</button></div></section>
    <h3 className="adr-section-title">Gerenciamento Rápido</h3><section className="adr-grid">{MENU.slice(1,9).map(([id,ic,label])=><button key={id} onClick={()=>setSection(id)}><span>{ic}</span><div><b>{label}</b><small>Abrir gerenciamento</small></div><strong>›</strong></button>)}</section>
   </>}
   {section==='store'&&<section className="adr-panel"><h2>🛒 Gerenciar Loja</h2><p>{fmt(metrics.items)} itens cadastrados atualmente.</p><button className="adr-primary" onClick={()=>{exit();clickSide('Loja')}}>Abrir Loja do PAI</button><button onClick={loadMetrics}>Atualizar contagem</button></section>}
   {section==='users'&&<section className="adr-panel"><h2>👥 Usuários</h2><p>Abra a moderação avançada para suspender usuários, liberar ou remover Premium e revisar contas.</p><button className="adr-primary" onClick={openOwner}>Abrir Moderação OWNER+</button><button onClick={()=>{exit();clickSide('Ranking')}}>Ver Ranking de Usuários</button></section>}
   {section==='ranks'&&<section className="adr-panel"><h2>✪ Patentes e Recompensas</h2><p>Consulte a evolução dos usuários e as patentes atuais.</p><button className="adr-primary" onClick={()=>{exit();clickSide('Ranking')}}>Abrir Ranking e Patentes</button></section>}
   {section==='events'&&<section className="adr-panel"><h2>▣ Eventos</h2><p>Crie um rascunho de evento. A publicação para todos depende do backend de eventos.</p><input value={eventName} onChange={e=>setEventName(e.target.value)} placeholder="Nome do evento"/><button className="adr-primary" onClick={saveEvent}>Salvar rascunho</button></section>}
   {section==='gifts'&&<section className="adr-panel"><h2>🎁 Presentes e Códigos</h2><p>Gere um código administrativo de rascunho para organizar campanhas. Ele não é resgatável até o backend de códigos ser conectado.</p><button className="adr-primary" onClick={generateCode}>Gerar código</button>{code&&<div className="adr-code"><b>{code}</b><button onClick={copyCode}>Copiar</button></div>}</section>}
   {section==='reports'&&<section className="adr-panel"><h2>⚠ Denúncias e Punições</h2><p>{fmt(metrics.reports)} denúncias pendentes. A análise e punição real continuam no painel OWNER+.</p><button className="adr-primary" onClick={openOwner}>Abrir Denúncias e Moderação</button></section>}
   {section==='content'&&<section className="adr-panel"><h2>📣 Conteúdo e Anúncios</h2><p>Salve um rascunho de aviso global para a próxima integração de broadcast.</p><textarea value={announcement} onChange={e=>setAnnouncement(e.target.value)} placeholder="Digite o aviso global..."/><button className="adr-primary" onClick={saveAnnouncement}>Salvar rascunho</button></section>}
   {section==='analytics'&&<section className="adr-panel"><h2>▥ Relatórios e Estatísticas</h2><div className="adr-mini-metrics"><div><small>Usuários</small><b>{fmt(metrics.users)}</b></div><div><small>Itens da loja</small><b>{fmt(metrics.items)}</b></div><div><small>Denúncias pendentes</small><b>{fmt(metrics.reports)}</b></div></div><button onClick={loadMetrics}>↻ Atualizar dados</button></section>}
   {section==='system'&&<section className="adr-panel"><h2>⚙ Configurações do Sistema</h2><label className="adr-switch"><input type="checkbox" checked={maintenance} onChange={toggleMaintenance}/><span/>Modo manutenção (preferência local)</label><p>Configurações críticas do servidor continuam protegidas no backend.</p></section>}
   {section==='history'&&<section className="adr-panel"><h2>↶ Histórico de Ações</h2>{history.length?history.map((h,i)=><div className="adr-history" key={i}><span>●</span><div><b>{h.text}</b><small>{new Date(h.at).toLocaleString('pt-BR')}</small></div></div>):<p>Nenhuma ação administrativa local registrada ainda.</p>}</section>}
  </main>
 </div>
}
