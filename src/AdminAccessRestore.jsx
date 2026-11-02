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

  if(!allowed||!sidebar)return null
  return <>
    {createPortal(<button className={open?'active':''} onClick={()=>setOpen(true)} title="Abrir Painel do Administrador"><ShieldCheck/><span>Administrador</span></button>,sidebar)}
    {open&&createPortal(<div className="ra-admin-grid" data-admin-access-restored style={{display:'none'}}/>,document.body)}
  </>
}
