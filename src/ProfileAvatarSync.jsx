import {useEffect} from 'react'
import {supabase} from './lib/supabase'

export default function ProfileAvatarSync(){
 useEffect(()=>{
  let alive=true
  let timer=null
  let lastUrl=''

  function applyAvatar(url,name='Usuário'){
   if(!url)return
   const targets=[...document.querySelectorAll('.ra-profile-id .ra-avatar, .pai-avatar-ring, .gp-avatar')]
   targets.forEach(target=>{
    let img=target.querySelector('img')
    if(!img){
     img=document.createElement('img')
     img.alt='Avatar'
     target.replaceChildren(img)
    }
    if(img.src!==url){
     img.src=url
     img.alt=`Foto de perfil de ${name}`
     img.style.width='100%'
     img.style.height='100%'
     img.style.objectFit='cover'
     img.style.display='block'
    }
   })
  }

  async function sync(){
   const {data:{user}}=await supabase.auth.getUser()
   if(!alive||!user)return
   const {data}=await supabase.from('profiles').select('avatar_url,display_name').eq('user_id',user.id).maybeSingle()
   if(!alive||!data?.avatar_url)return
   const url=data.avatar_url
   if(url!==lastUrl)lastUrl=url
   applyAvatar(url,data.display_name||'Usuário')
  }

  sync()
  timer=setInterval(()=>{
   if(document.querySelector('.ra-profile,.pai-profile-screen,.gp-screen'))sync()
  },1500)

  const observer=new MutationObserver(()=>{
   if(lastUrl&&document.querySelector('.ra-profile,.pai-profile-screen,.gp-screen'))applyAvatar(lastUrl)
  })
  observer.observe(document.body,{childList:true,subtree:true})

  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>sync())
  return()=>{
   alive=false
   clearInterval(timer)
   observer.disconnect()
   subscription?.unsubscribe?.()
  }
 },[])
 return null
}
