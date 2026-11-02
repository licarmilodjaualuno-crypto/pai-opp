import { useEffect } from 'react'

export default function TopSearchDock(){
  useEffect(()=>{
    let box=null
    let filters=null
    let active='all'
    const apply=()=>{
      const q=(box?.querySelector('input')?.value||'').trim().toLocaleLowerCase('pt-BR')
      document.querySelectorAll('.chat-row').forEach(row=>{
        const text=row.textContent.toLocaleLowerCase('pt-BR')
        const isGroup=text.includes('group')||text.includes('grupo')
        const isUnread=!!row.querySelector('.unread')
        const isFavorite=row.dataset.favorite==='true'||row.classList.contains('favorite')
        const matchesFilter=active==='all'||(active==='groups'&&isGroup)||(active==='unread'&&isUnread)||(active==='favorites'&&isFavorite)
        row.style.display=(!q||text.includes(q))&&matchesFilter?'':'none'
      })
    }
    const setActive=(value)=>{
      active=value
      filters?.querySelectorAll('button[data-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===value))
      apply()
    }
    const mount=()=>{
      const header=document.querySelector('.app-shell .topbar')
      if(!header){box?.remove();filters?.remove();box=null;filters=null;return}
      if(!document.querySelector('.pai-top-search')){
        box=document.createElement('div')
        box.className='pai-top-search'
        box.innerHTML=`<span aria-hidden="true">⌕</span><input type="search" aria-label="Pesquisar no PAI" placeholder="Pesquisar no PAI" />`
        header.insertAdjacentElement('afterend',box)
        box.querySelector('input').addEventListener('input',apply)
      }else box=document.querySelector('.pai-top-search')
      const isChat=[...document.querySelectorAll('.section-heading h2')].some(h=>h.textContent.trim()==='Conversas')
      if(isChat&&!document.querySelector('.pai-chat-filters')){
        filters=document.createElement('div')
        filters.className='pai-chat-filters'
        filters.innerHTML=`<button class="active" data-filter="all">Todas</button><button data-filter="unread">Não lidas</button><button data-filter="favorites">Favoritos</button><button data-filter="groups">Grupos</button><button class="filter-plus" data-action="new-group" aria-label="Criar grupo">+</button>`
        box.insertAdjacentElement('afterend',filters)
        filters.querySelectorAll('button[data-filter]').forEach(btn=>btn.addEventListener('click',()=>setActive(btn.dataset.filter)))
        filters.querySelector('[data-action="new-group"]').addEventListener('click',()=>{
          const input=document.querySelector('.group-create input')
          if(input){input.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>input.focus(),250)}
        })
        apply()
      }
      if(!isChat){document.querySelector('.pai-chat-filters')?.remove();filters=null;active='all';apply()}
    }
    mount()
    const observer=new MutationObserver(mount)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>{observer.disconnect();document.querySelector('.pai-top-search')?.remove();document.querySelector('.pai-chat-filters')?.remove()}
  },[])
  return null
}
