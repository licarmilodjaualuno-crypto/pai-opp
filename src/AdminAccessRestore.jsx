import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function AdminAccessRestore(){
  const [session,setSession]=useState(null)
  const [allowed,setAllowed]=useState(false)
  const [sidebar,setSidebar]=useState(null)
  const [open,setOpen]=useState(false)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    let alive=true
    async function check(){
      const uid=session?.user?.id
      if(!uid){ if(alive)setAllowed(false); return }
      const {data,error}=await supabase.from('user_roles').select('role').eq('user_id',uid)
      if(!alive)return
      setAllowed(!error && (data||[]).some(r=>r.role==='owner'||r.role==='admin'))
    }
    check()
    return ()=>{alive=false}
  },[session?.user?.id])

  useEffect(()=>{
    const sync=()=>setSidebar(document.querySelector('.ra-side'))
    sync()
    const mo=new MutationObserver(sync)
    mo.observe(document.body,{childList:true,subtree:true})
    return ()=>mo.disconnect()
  },[])

  useEffect(()=>{
    const onClick=e=>{
      if(e.target.closest?.('.adr-exit'))setOpen(false)
    }
    document.addEventListener('click',onClick,true)
    return ()=>document.removeEventListener('click',onClick,true)
  },[])

  if(!allowed)return null

  const button=<button
    className={`admin-access-restored ${open?'active':''}`}
    onClick={()=>setOpen(true)}
    title="Abrir Painel do Administrador"
    aria-label="Abrir Painel do Administrador"
    style={sidebar?undefined:{
      position:'fixed',right:'16px',bottom:'84px',zIndex:99998,
      display:'flex',alignItems:'center',gap:'8px',padding:'12px 14px',
      border:'1px solid rgba(139,92,246,.55)',borderRadius:'14px',
      background:'rgba(15,10,32,.96)',color:'#fff',fontWeight:800,
      boxShadow:'0 10px 32px rgba(0,0,0,.38)',cursor:'pointer'
    }}
  ><ShieldCheck size={20}/><span>Administrador</span></button>

  return <>
    {createPortal(button,sidebar||document.body)}
    {open&&createPortal(<div className="ra-admin-grid" data-admin-access-restored style={{display:'none'}}/>,document.body)}
  </>
}
