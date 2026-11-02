import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import './profile-photo-feed-patch.css'

export default function ProfilePhotoFeedPatch(){
  useEffect(()=>{
    let active = true
    let userId = null
    let photos = []

    async function load(){
      const { data:{ session } } = await supabase.auth.getSession()
      userId = session?.user?.id || null
      if(!userId) return
      const { data } = await supabase
        .from('posts')
        .select('id,image_url,created_at')
        .eq('user_id', userId)
        .not('image_url','is',null)
        .order('created_at',{ascending:false})
        .limit(20)
      if(!active) return
      photos = (data || []).filter(p=>p.image_url)
      patch()
    }

    function openPhotos(){
      const link = document.querySelector('.ra-myphotos > div:first-child button')
      if(link) link.click()
    }

    function patch(){
      const slots = document.querySelector('.ra-profile .ra-myphotos .ra-photo-slots')
      if(!slots) return
      const signature = photos.map(p=>p.id).join('|') || 'empty'
      if(slots.dataset.paiFeedSignature === signature) return

      slots.dataset.paiFeedSignature = signature
      slots.classList.add('pai-profile-photo-feed')
      slots.replaceChildren()

      if(!photos.length){
        const empty = document.createElement('button')
        empty.type = 'button'
        empty.className = 'pai-profile-photo-empty'
        empty.innerHTML = '<span class="pai-plus">＋</span><strong>Adicionar foto</strong><small>Suas fotos aparecerão aqui, uma por vez.</small>'
        empty.addEventListener('click', openPhotos)
        slots.appendChild(empty)
        return
      }

      photos.forEach((photo,index)=>{
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'pai-profile-photo-card'
        button.setAttribute('aria-label', `Abrir foto ${index + 1}`)

        const img = document.createElement('img')
        img.src = photo.image_url
        img.alt = `Foto ${index + 1} do perfil`
        img.loading = index === 0 ? 'eager' : 'lazy'

        const counter = document.createElement('span')
        counter.className = 'pai-profile-photo-counter'
        counter.textContent = `${index + 1}/${photos.length}`

        button.append(img,counter)
        button.addEventListener('click', openPhotos)
        slots.appendChild(button)
      })
    }

    load()
    const observer = new MutationObserver(()=>patch())
    observer.observe(document.body,{childList:true,subtree:true})

    const { data:{ subscription } } = supabase.auth.onAuthStateChange(()=>load())
    return()=>{
      active = false
      observer.disconnect()
      subscription?.unsubscribe?.()
    }
  },[])

  return null
}
