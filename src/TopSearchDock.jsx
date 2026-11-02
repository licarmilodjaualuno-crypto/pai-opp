import { useEffect } from 'react'

export default function TopSearchDock(){
  useEffect(()=>{
    let box=null
    const mount=()=>{
      const header=document.querySelector('.app-shell .topbar')
      if(!header){if(box){box.remove();box=null}return}
      if(document.querySelector('.pai-top-search'))return
      box=document.createElement('div')
      box.className='pai-top-search'
      box.innerHTML=`<span aria-hidden="true">⌕</span><input type="search" aria-label="Pesquisar no PAI" placeholder="Pesquisar no PAI" />`
      header.insertAdjacentElement('afterend',box)
      const input=box.querySelector('input')
      input.addEventListener('input',()=>{
        const q=input.value.trim().toLocaleLowerCase('pt-BR')
        document.querySelectorAll('.chat-row').forEach(row=>{
          row.style.display=!q||row.textContent.toLocaleLowerCase('pt-BR').includes(q)?'':'none'
        })
      })
    }
    mount()
    const observer=new MutationObserver(mount)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>{observer.disconnect();document.querySelector('.pai-top-search')?.remove()}
  },[])
  return null
}
