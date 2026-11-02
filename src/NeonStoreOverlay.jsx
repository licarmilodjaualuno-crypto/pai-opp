import { useEffect, useMemo, useState } from 'react'
import { Box, ChevronLeft, Crown, Diamond, Gem, Gift, Menu, PackageOpen, Plus, ShoppingCart, Sparkles, Star, Shirt, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './neon-store.css'

const NAV = [
  ['featured', Star, 'Destaque'],
  ['boxes', Box, 'Caixas Surpresa'],
  ['pass', Crown, 'Passe PAI'],
  ['skins', Shirt, 'Skins'],
  ['special', Gem, 'Itens Especiais'],
  ['other', Sparkles, 'Outros'],
]

const SECTION_INFO = {
  entry_effect: ['Efeitos de Entrada', 'Animações especiais quando você entra no perfil.'],
  frame: ['Molduras de Perfil', 'Molduras exclusivas para sua foto de perfil.'],
  theme: ['Temas de Chat', 'Personalize o visual das suas conversas.'],
  cover: ['Capas de Perfil', 'Capinhas especiais para o seu cartão de perfil.'],
}

const VISUAL_EMOJI = {
  gold:'♛', flame:'🔥', constellation:'✦', storm:'⚡', royal:'👑', shadow:'✧', galaxy:'✦', dragon:'🐉',
  night:'🌙', neon:'💜', forest:'🍃', king:'♕', crown:'👑', cyber:'⌁', aurora:'🌌', 'pass-neon':'🎫', 'pass-royal':'🏆'
}

function fmt(n){ return Number(n||0).toLocaleString('pt-BR') }

function detectStoreOpen(){
  return [...document.querySelectorAll('.section-heading h2')].some(el => el.textContent?.trim()==='Loja' && !el.closest('.pai-neon-store'))
}

function ItemPreview({item}){
  const visual=item.metadata?.visual || item.category
  return <div className={`pai-product-art art-${visual}`}><span>{VISUAL_EMOJI[visual] || (item.category==='box'?'🎁':'✨')}</span></div>
}

export default function NeonStoreOverlay(){
  const [visible,setVisible]=useState(false)
  const [mobileMenu,setMobileMenu]=useState(false)
  const [tab,setTab]=useState('skins')
  const [items,setItems]=useState([])
  const [inventory,setInventory]=useState([])
  const [wallet,setWallet]=useState({coins:0,diamonds:0})
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState('')
  const [inventoryOpen,setInventoryOpen]=useState(false)
  const [rechargeOpen,setRechargeOpen]=useState(false)
  const [focusSection,setFocusSection]=useState(null)

  useEffect(()=>{
    const sync=()=>setVisible(detectStoreOpen())
    sync()
    const ob=new MutationObserver(sync)
    ob.observe(document.body,{subtree:true,childList:true,characterData:true})
    return()=>ob.disconnect()
  },[])

  async function load(){
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const [storeRes,invRes,walletRes]=await Promise.all([
      supabase.from('store_items').select('*').eq('active',true),
      supabase.from('inventory').select('item_id,quantity,equipped').eq('user_id',user.id),
      supabase.from('wallets').select('coins,diamonds').eq('user_id',user.id).maybeSingle(),
    ])
    setItems(storeRes.data||[])
    setInventory(invRes.data||[])
    if(walletRes.data)setWallet(walletRes.data)
  }

  useEffect(()=>{ if(visible) load() },[visible])

  const owned=useMemo(()=>Object.fromEntries(inventory.map(i=>[i.item_id,i])),[inventory])
  const byId=useMemo(()=>Object.fromEntries(items.map(i=>[i.id,i])),[items])

  const skinItems=items.filter(i=>['entry_effect','frame','theme','cover'].includes(i.category))
  const featured=items.filter(i=>i.metadata?.featured).slice(0,12)
  const boxItems=items.filter(i=>i.category==='box')
  const passItems=items.filter(i=>i.category==='pass')
  const specialItems=items.filter(i=>['badge','effect','special'].includes(i.category))
  const otherItems=items.filter(i=>['emoji','sticker'].includes(i.category))

  async function buy(item,currency){
    setBusy(item.id+currency);setMessage('')
    const {error}=await supabase.rpc('buy_store_item_with_currency',{p_item_id:item.id,p_currency:currency})
    setBusy('')
    if(error){setMessage(error.message.includes('insufficient')?'Saldo insuficiente para essa compra.':error.message);return}
    setMessage(`${item.name} foi para o seu inventário.`)
    await load()
  }

  async function equip(item){
    setBusy('equip'+item.id);setMessage('')
    const {error}=await supabase.rpc('equip_inventory_item',{p_item_id:item.id})
    setBusy('')
    if(error){setMessage(error.message);return}
    setMessage(`${item.name} aplicado na sua conta.`)
    await load()
    window.dispatchEvent(new CustomEvent('pai-cosmetics-updated'))
  }

  async function openBox(item){
    setBusy('box'+item.id);setMessage('')
    const {data,error}=await supabase.rpc('open_surprise_box',{p_item_id:item.id})
    setBusy('')
    if(error){setMessage(error.message);return}
    await load()
    setMessage(`Caixa aberta! Você recebeu: ${byId[data]?.name || data}.`)
  }

  function goBack(){
    setVisible(false)
    const buttons=[...document.querySelectorAll('button')]
    const home=buttons.find(b=>!b.closest('.pai-neon-store') && b.textContent?.trim().includes('Início'))
    home?.click()
  }

  function chooseTab(id){setTab(id);setFocusSection(null);setMobileMenu(false);setInventoryOpen(false)}

  if(!visible)return <CosmeticThemeBridge items={items}/>

  const renderCards=(list)=> <div className="pai-product-grid">{list.map(item=><ProductCard key={item.id} item={item} inv={owned[item.id]} busy={busy} onBuy={buy}/>)}</div>

  return <>
    <CosmeticThemeBridge items={items}/>
    <div className="pai-neon-store">
      <header className="pai-store-topbar">
        <button className="pai-back" onClick={goBack} aria-label="Voltar"><ChevronLeft/></button>
        <button className="pai-mobile-menu" onClick={()=>setMobileMenu(v=>!v)} aria-label="Abrir menu"><Menu/></button>
        <div className="pai-logo">♛<b>PAI</b></div>
        <div className="pai-store-title"><Shirt/><div><h1>Loja de Skins</h1><p>Personalize seu perfil, seus chats e sua entrada no PAI.</p></div></div>
        <div className="pai-balances">
          <button className="pai-balance" onClick={()=>setRechargeOpen(true)}><span>🪙</span><b>{fmt(wallet.coins)}</b><Plus/></button>
          <button className="pai-balance" onClick={()=>setRechargeOpen(true)}><span>💎</span><b>{fmt(wallet.diamonds)}</b><Plus/></button>
          <button className="pai-cart" onClick={()=>setInventoryOpen(true)} aria-label="Abrir inventário"><ShoppingCart/><em>{inventory.reduce((n,i)=>n+i.quantity,0)}</em></button>
        </div>
      </header>

      <div className="pai-store-body">
        <aside className={`pai-store-sidebar ${mobileMenu?'open':''}`}>
          <div className="pai-sidebar-head"><b>Loja PAI</b><button onClick={()=>setMobileMenu(false)}><X/></button></div>
          {NAV.map(([id,Icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>chooseTab(id)}><Icon/><span>{label}</span></button>)}
          <button className={inventoryOpen?'active':''} onClick={()=>{setInventoryOpen(true);setMobileMenu(false)}}><ShoppingCart/><span>Inventário</span></button>
        </aside>

        <main className="pai-store-content">
          {message&&<div className="pai-store-message">{message}<button onClick={()=>setMessage('')}><X/></button></div>}
          {tab==='skins' && <SkinsView items={skinItems} focusSection={focusSection} setFocusSection={setFocusSection} inv={owned} busy={busy} onBuy={buy}/>} 
          {tab==='featured' && <CategoryPage title="Destaque" subtitle="Os itens mais procurados da Loja PAI." icon="⭐">{renderCards(featured)}</CategoryPage>}
          {tab==='boxes' && <CategoryPage title="Caixas Surpresa" subtitle="Compre uma caixa e abra no inventário para receber um cosmético aleatório." icon="🎁">{renderCards(boxItems)}</CategoryPage>}
          {tab==='pass' && <CategoryPage title="Passe PAI" subtitle="Recompensas especiais inspiradas na trilha do Passe PAI." icon="🎫">{renderCards(passItems)}</CategoryPage>}
          {tab==='special' && <CategoryPage title="Itens Especiais" subtitle="Badges, efeitos e pacotes especiais." icon="💎">{renderCards(specialItems)}</CategoryPage>}
          {tab==='other' && <CategoryPage title="Outros" subtitle="Emojis, stickers e extras para sua conta." icon="✨">{renderCards(otherItems)}</CategoryPage>}
        </main>
      </div>

      {inventoryOpen&&<InventoryDrawer inventory={inventory} byId={byId} busy={busy} onClose={()=>setInventoryOpen(false)} onEquip={equip} onOpenBox={openBox}/>} 
      {rechargeOpen&&<RechargeModal onClose={()=>setRechargeOpen(false)} onGoPass={()=>{setRechargeOpen(false);chooseTab('pass')}}/>}
    </div>
  </>
}

function ProductCard({item,inv,busy,onBuy}){
  return <article className="pai-product-card">
    {item.metadata?.badge&&<span className={`pai-badge badge-${String(item.metadata.badge).toLowerCase()}`}>{item.metadata.badge}</span>}
    <ItemPreview item={item}/>
    <h3>{item.name}</h3>
    <div className="pai-price-row">
      {item.coin_price>0&&<button disabled={!!busy} onClick={()=>onBuy(item,'coins')}><span>🪙</span>{fmt(item.coin_price)}</button>}
      {item.coin_price>0&&item.diamond_price>0&&<small>ou</small>}
      {item.diamond_price>0&&<button disabled={!!busy} onClick={()=>onBuy(item,'diamonds')}><span>💎</span>{fmt(item.diamond_price)}</button>}
    </div>
    {inv&&<span className="pai-owned">No inventário × {inv.quantity}</span>}
  </article>
}

function SkinsView({items,focusSection,setFocusSection,inv,busy,onBuy}){
  const groups=['entry_effect','frame','theme','cover']
  const visible=focusSection?[focusSection]:groups
  return <div className="pai-skins-view">
    {focusSection&&<button className="pai-section-back" onClick={()=>setFocusSection(null)}><ChevronLeft/> Voltar para todas as categorias</button>}
    {visible.map(cat=>{
      const data=items.filter(i=>i.category===cat)
      const [title,subtitle]=SECTION_INFO[cat]
      return <section className="pai-skin-row" key={cat}>
        <div className="pai-skin-intro"><div className={`pai-section-icon sec-${cat}`}>{cat==='entry_effect'?'⌁':cat==='frame'?'◯':cat==='theme'?'💬':'▣'}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>
        <div className="pai-skin-products">{data.slice(0,focusSection?20:4).map(item=><ProductCard key={item.id} item={item} inv={inv[item.id]} busy={busy} onBuy={onBuy}/>)}</div>
        {!focusSection&&<button className="pai-see-all" onClick={()=>setFocusSection(cat)}>Ver todos ›</button>}
      </section>
    })}
  </div>
}

function CategoryPage({title,subtitle,icon,children}){return <section className="pai-category-page"><div className="pai-category-hero"><span>{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>}

function InventoryDrawer({inventory,byId,busy,onClose,onEquip,onOpenBox}){
  return <div className="pai-drawer-mask" onClick={onClose}><aside className="pai-inventory" onClick={e=>e.stopPropagation()}><div className="pai-inventory-head"><div><ShoppingCart/><h2>Meu inventário</h2></div><button onClick={onClose}><X/></button></div>
    <div className="pai-inventory-list">{inventory.length===0?<div className="pai-empty"><PackageOpen/><p>Você ainda não comprou nenhum item.</p></div>:inventory.map(inv=>{const item=byId[inv.item_id];if(!item)return null;const applicable=!['box','emoji','sticker'].includes(item.category);return <article key={inv.item_id} className={inv.equipped?'equipped':''}><ItemPreview item={item}/><div><h3>{item.name}</h3><p>Quantidade: {inv.quantity}</p>{inv.equipped&&<b>Aplicado</b>}</div>{item.category==='box'?<button disabled={!!busy} onClick={()=>onOpenBox(item)}>Abrir caixa</button>:applicable?<button disabled={!!busy||inv.equipped} onClick={()=>onEquip(item)}>{inv.equipped?'Aplicado':'Aplicar'}</button>:<span className="pai-consumable">Disponível</span>}</article>})}</div>
  </aside></div>
}

function RechargeModal({onClose,onGoPass}){return <div className="pai-modal-mask" onClick={onClose}><div className="pai-recharge" onClick={e=>e.stopPropagation()}><button className="pai-modal-close" onClick={onClose}><X/></button><Diamond size={44}/><h2>Adicionar saldo</h2><p>A recarga em dinheiro ainda não está conectada a um meio de pagamento. Você pode ganhar recompensas e itens pelo Passe PAI sem criar uma cobrança falsa.</p><button className="pai-primary" onClick={onGoPass}>Ir para Passe PAI</button></div></div>}

function CosmeticThemeBridge(){
  const [equipped,setEquipped]=useState([])
  async function sync(){
    const {data:{user}}=await supabase.auth.getUser();if(!user)return setEquipped([])
    const {data:inv}=await supabase.from('inventory').select('item_id,equipped').eq('user_id',user.id).eq('equipped',true)
    const ids=(inv||[]).map(x=>x.item_id)
    if(!ids.length)return setEquipped([])
    const {data}=await supabase.from('store_items').select('id,category,metadata').in('id',ids)
    setEquipped(data||[])
  }
  useEffect(()=>{sync();const h=()=>sync();window.addEventListener('pai-cosmetics-updated',h);const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>sync());return()=>{window.removeEventListener('pai-cosmetics-updated',h);subscription.unsubscribe()}},[])
  useEffect(()=>{
    const root=document.documentElement
    ;['entry_effect','frame','theme','cover','badge','effect','pass','special'].forEach(c=>root.removeAttribute(`data-pai-${c}`))
    equipped.forEach(i=>root.setAttribute(`data-pai-${i.category}`,i.metadata?.visual||i.id))
  },[equipped])
  return null
}
