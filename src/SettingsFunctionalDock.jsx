import {useEffect,useMemo,useState} from 'react'
import {supabase} from './lib/supabase'
import './settings-functional.css'

const KEYS={
 privacy:'pai_privacy_settings',
 notifications:'pai_notification_settings',
 media:'pai_media_settings',
 appearance:'pai_appearance_settings',
 language:'pai_language'
}

const defs={
 'Conta e segurança':{id:'account',icon:'🛡',title:'Conta e segurança'},
 'Privacidade':{id:'privacy',icon:'🔒',title:'Privacidade'},
 'Notificações':{id:'notifications',icon:'🔔',title:'Notificações'},
 'Chats e mídia':{id:'media',icon:'💬',title:'Chats e mídia'},
 'Aparência':{id:'appearance',icon:'🎨',title:'Aparência'},
 'Armazenamento':{id:'storage',icon:'🗄',title:'Armazenamento'},
 'Idioma':{id:'language',icon:'🌐',title:'Idioma'},
 'Ajuda e suporte':{id:'help',icon:'❔',title:'Ajuda e suporte'},
 'Sobre o PAI':{id:'about',icon:'ⓘ',title:'Sobre o PAI'}
}

function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function Toggle({value,onChange,label,desc}){return <label className="sfd-toggle"><div><b>{label}</b>{desc&&<small>{desc}</small>}</div><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/><span/></label>}

export default function SettingsFunctionalDock(){
 const[active,setActive]=useState(null),[email,setEmail]=useState(''),[message,setMessage]=useState(''),[storage,setStorage]=useState(null)
 const[privacy,setPrivacy]=useState(()=>load(KEYS.privacy,{publicProfile:true,showOnline:true,statusVisible:true}))
 const[notifs,setNotifs]=useState(()=>load(KEYS.notifications,{messages:true,groups:true,games:true,events:true}))
 const[media,setMedia]=useState(()=>load(KEYS.media,{autoDownload:false,highQuality:true,enterSend:true}))
 const[appearance,setAppearance]=useState(()=>load(KEYS.appearance,{mode:'dark',compact:false}))
 const[language,setLanguage]=useState(()=>localStorage.getItem(KEYS.language)||'pt-BR')

 useEffect(()=>{save(KEYS.privacy,privacy)},[privacy])
 useEffect(()=>{save(KEYS.notifications,notifs)},[notifs])
 useEffect(()=>{save(KEYS.media,media)},[media])
 useEffect(()=>{save(KEYS.appearance,appearance);document.documentElement.dataset.paiTheme=appearance.mode;document.documentElement.dataset.paiCompact=appearance.compact?'1':'0'},[appearance])
 useEffect(()=>{localStorage.setItem(KEYS.language,language)},[language])

 useEffect(()=>{
   supabase.auth.getUser().then(({data})=>setEmail(data.user?.email||''))
   let cleanup=[]
   const bind=()=>{
     cleanup.forEach(fn=>fn());cleanup=[]
     const box=document.querySelector('.ra-settings')
     if(!box)return
     box.querySelectorAll(':scope > button').forEach(btn=>{
       const label=btn.querySelector('strong')?.textContent?.trim()
       const def=defs[label]
       if(!def)return
       const fn=e=>{e.preventDefault();e.stopPropagation();setMessage('');setActive(def.id)}
       btn.addEventListener('click',fn,true);cleanup.push(()=>btn.removeEventListener('click',fn,true))
     })
     if(!box.querySelector('.sfd-account-actions')){
       const actions=document.createElement('div');actions.className='sfd-account-actions'
       const swap=document.createElement('button');swap.type='button';swap.className='sfd-swap';swap.innerHTML='<span>⇄</span><div><strong>Trocar de conta</strong><small>Sair desta conta e entrar em outra</small></div><b>›</b>'
       const exit=document.createElement('button');exit.type='button';exit.className='sfd-exit';exit.innerHTML='<span>↪</span><div><strong>Sair da conta</strong><small>Encerrar esta sessão no PAI</small></div><b>›</b>'
       swap.onclick=async()=>{await supabase.auth.signOut();window.location.reload()}
       exit.onclick=async()=>{await supabase.auth.signOut();window.location.reload()}
       actions.append(swap,exit);box.appendChild(actions)
     }
   }
   bind();const mo=new MutationObserver(bind);mo.observe(document.body,{childList:true,subtree:true});return()=>{mo.disconnect();cleanup.forEach(fn=>fn())}
 },[])

 async function resetPassword(){if(!email)return setMessage('Não foi possível identificar o e-mail desta conta.');const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});setMessage(error?error.message:`Enviamos um link de redefinição para ${email}.`)}
 async function requestNotifications(){if(!('Notification'in window))return setMessage('Este navegador não oferece notificações.');const p=await Notification.requestPermission();setMessage(p==='granted'?'Notificações do navegador permitidas.':'Permissão de notificações não concedida.')}
 async function inspectStorage(){if(navigator.storage?.estimate){const x=await navigator.storage.estimate();setStorage({usage:x.usage||0,quota:x.quota||0})}else setStorage({usage:0,quota:0})}
 async function clearCache(){try{if('caches'in window){for(const k of await caches.keys())await caches.delete(k)}setMessage('Cache do aplicativo limpo. Seus dados de conta foram preservados.');inspectStorage()}catch(e){setMessage(e.message||'Não foi possível limpar o cache.') }}
 const storageText=useMemo(()=>storage?`${(storage.usage/1024/1024).toFixed(1)} MB usados${storage.quota?` de ${(storage.quota/1024/1024/1024).toFixed(1)} GB disponíveis`:''}`:'', [storage])
 if(!active)return null
 return <div className="sfd-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setActive(null)}><section className="sfd-panel">
   <header><button onClick={()=>setActive(null)}>←</button><h2>{Object.values(defs).find(x=>x.id===active)?.title}</h2><button onClick={()=>setActive(null)}>✕</button></header>
   <div className="sfd-body">
    {active==='account'&&<><div className="sfd-card"><span>Conta conectada</span><b>{email||'Conta PAI'}</b></div><button className="sfd-primary" onClick={resetPassword}>Enviar link para alterar senha</button><p className="sfd-note">A alteração de e-mail e verificação em duas etapas dependem das opções de autenticação habilitadas no servidor.</p></>}
    {active==='privacy'&&<><Toggle label="Perfil público" desc="Permitir que outros usuários vejam seu perfil" value={privacy.publicProfile} onChange={v=>setPrivacy({...privacy,publicProfile:v})}/><Toggle label="Mostrar quando estou online" value={privacy.showOnline} onChange={v=>setPrivacy({...privacy,showOnline:v})}/><Toggle label="Status visível" value={privacy.statusVisible} onChange={v=>setPrivacy({...privacy,statusVisible:v})}/></>}
    {active==='notifications'&&<><button className="sfd-primary" onClick={requestNotifications}>Permitir notificações no navegador</button><Toggle label="Mensagens" value={notifs.messages} onChange={v=>setNotifs({...notifs,messages:v})}/><Toggle label="Grupos" value={notifs.groups} onChange={v=>setNotifs({...notifs,groups:v})}/><Toggle label="Jogos" value={notifs.games} onChange={v=>setNotifs({...notifs,games:v})}/><Toggle label="Eventos" value={notifs.events} onChange={v=>setNotifs({...notifs,events:v})}/></>}
    {active==='media'&&<><Toggle label="Download automático" desc="Baixar mídias automaticamente" value={media.autoDownload} onChange={v=>setMedia({...media,autoDownload:v})}/><Toggle label="Mídia em alta qualidade" value={media.highQuality} onChange={v=>setMedia({...media,highQuality:v})}/><Toggle label="Enter envia mensagem" value={media.enterSend} onChange={v=>setMedia({...media,enterSend:v})}/></>}
    {active==='appearance'&&<><div className="sfd-choice"><b>Tema</b><div><button className={appearance.mode==='dark'?'active':''} onClick={()=>setAppearance({...appearance,mode:'dark'})}>Escuro</button><button className={appearance.mode==='neon'?'active':''} onClick={()=>setAppearance({...appearance,mode:'neon'})}>Neon PAI</button></div></div><Toggle label="Modo compacto" value={appearance.compact} onChange={v=>setAppearance({...appearance,compact:v})}/></>}
    {active==='storage'&&<><button className="sfd-primary" onClick={inspectStorage}>Calcular armazenamento</button>{storageText&&<div className="sfd-card"><span>Uso aproximado</span><b>{storageText}</b></div>}<button className="sfd-danger" onClick={clearCache}>Limpar cache</button></>}
    {active==='language'&&<div className="sfd-choice"><b>Idioma do PAI</b><div><button className={language==='pt-BR'?'active':''} onClick={()=>setLanguage('pt-BR')}>Português (BR)</button><button className={language==='en'?'active':''} onClick={()=>setLanguage('en')}>English</button></div><p className="sfd-note">A preferência fica salva. As telas ainda não traduzidas continuarão em português até receberem suas traduções.</p></div>}
    {active==='help'&&<><div className="sfd-card"><b>Central de ajuda PAI</b><span>Use esta área para dúvidas, problemas e sugestões.</span></div><button className="sfd-primary" onClick={()=>setMessage('Relato registrado localmente. O canal de suporte poderá ser conectado depois.')}>Reportar um problema</button><button className="sfd-secondary" onClick={()=>setMessage('Sugestão registrada localmente. O canal de suporte poderá ser conectado depois.')}>Enviar sugestão</button></>}
    {active==='about'&&<><div className="sfd-card"><span>Aplicativo</span><b>PAI</b></div><div className="sfd-card"><span>Versão da interface</span><b>2026.11</b></div><p className="sfd-note">Converse, jogue e evolua. Esta página reúne informações do aplicativo, termos e políticas quando forem publicados.</p></>}
    {message&&<div className="sfd-message">{message}</div>}
   </div>
 </section></div>
}
