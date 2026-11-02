import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import GamerProfile from './GamerProfile'

export default function GamerProfileOverlay(){
  const[open,setOpen]=useState(false)
  const[account,setAccount]=useState(null)
  const[wallet,setWallet]=useState(null)

  async function load(){
    const {data:{session}}=await supabase.auth.getSession()
    if(!session?.user?.id)return
    const uid=session.user.id
    const [p,w]=await Promise.all([
      supabase.from('profiles').select('*').eq('user_id',uid).single(),
      supabase.from('wallets').select('*').eq('user_id',uid).single()
    ])
    setAccount(p.data||null);setWallet(w.data||null)
  }

  useEffect(()=>{
    const handler=(e)=>{
      const btn=e.target.closest('button')
      if(!btn)return
      const txt=(btn.textContent||'').trim().toLowerCase()
      if(txt==='perfil'||txt.endsWith('perfil')){setOpen(true);load()}
    }
    document.addEventListener('click',handler,true)
    return()=>document.removeEventListener('click',handler,true)
  },[])

  useEffect(()=>{
    if(open)document.body.classList.add('gp-open')
    else document.body.classList.remove('gp-open')
    return()=>document.body.classList.remove('gp-open')
  },[open])

  function go(page){
    if(page==='profile-edit'){setOpen(false);setTimeout(()=>document.querySelector('.profileplus-fab')?.click(),80);return}
    setOpen(false)
    if(page==='home'){
      const b=[...document.querySelectorAll('.bottom-nav button')].find(x=>(x.textContent||'').trim()==='Início');b?.click();return
    }
    if(page==='ranking'){
      const b=[...document.querySelectorAll('.bottom-nav button')].find(x=>(x.textContent||'').trim()==='Ranking');b?.click();return
    }
    if(page==='settings'){
      const b=document.querySelector('.top-actions button[title="Configurações"]');b?.click();return
    }
    if(page==='store'){
      const b=document.querySelector('.top-actions button[title="Loja"]');b?.click();return
    }
    if(page==='photos'||page==='pass'){
      const cards=[...document.querySelectorAll('button')]
      const wanted=page==='photos'?'Fotos':'Passe PAI'
      const b=cards.find(x=>(x.textContent||'').includes(wanted));b?.click();return
    }
  }

  if(!open||!account)return null
  return <div style={{position:'fixed',inset:0,zIndex:2147483000,overflow:'hidden',background:'#070912'}}><GamerProfile account={account} wallet={wallet} onGo={go}/></div>
}
