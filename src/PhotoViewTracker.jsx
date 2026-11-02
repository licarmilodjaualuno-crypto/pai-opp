import { useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function PhotoViewTracker(){
  useEffect(()=>{
    let stopped=false
    let running=false
    async function registerViews(){
      if(stopped||running)return
      const photosOpen=[...document.querySelectorAll('h2')].some(el=>el.textContent?.trim()==='Fotos')
      if(!photosOpen)return
      running=true
      try{
        const {data:{session}}=await supabase.auth.getSession()
        const uid=session?.user?.id
        if(!uid)return
        const {data:posts}=await supabase.from('posts').select('id,user_id').neq('user_id',uid).order('created_at',{ascending:false})
        if(posts?.length){
          await supabase.from('post_views').upsert(posts.map(p=>({post_id:p.id,user_id:uid})),{onConflict:'post_id,user_id',ignoreDuplicates:true})
        }
      }finally{running=false}
    }
    const observer=new MutationObserver(registerViews)
    observer.observe(document.body,{childList:true,subtree:true})
    registerViews()
    return()=>{stopped=true;observer.disconnect()}
  },[])
  return null
}
