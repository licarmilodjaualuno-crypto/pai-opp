import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './googlelogin.css'

export default function GoogleLoginDock(){
  const[session,setSession]=useState(undefined)
  const[msg,setMsg]=useState('')
  const[loading,setLoading]=useState(false)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session||null))
    const{data:l}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next||null))
    return()=>l.subscription.unsubscribe()
  },[])

  async function continueWithGoogle(){
    setLoading(true)
    setMsg('')
    const redirectTo=`${window.location.origin}${window.location.pathname}`
    const{error}=await supabase.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo}
    })
    if(error){setMsg(error.message||'Não foi possível continuar com o Google.');setLoading(false)}
  }

  if(session!==null)return null
  return <div className="google-login-dock" aria-label="Entrar ou cadastrar com Google">
    <div className="google-divider"><span/>ou<span/></div>
    <button type="button" className="google-login-button" disabled={loading} onClick={continueWithGoogle}>
      <span className="google-g">G</span>
      {loading?'Abrindo Google...':'Continuar com Google'}
    </button>
    <small>Crie sua conta ou entre sem precisar digitar uma nova senha no PAI.</small>
    {msg&&<p>{msg}</p>}
  </div>
}
