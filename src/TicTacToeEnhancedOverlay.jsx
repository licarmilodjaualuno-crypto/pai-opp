import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,Bot,Gamepad2,Search,UserPlus,Users,X} from 'lucide-react'
import {supabase} from './lib/supabase'
import './tic-tac-toe-enhanced.css'

const SIZE=10
const WIN=5
const emptyBoard=()=>Array(SIZE*SIZE).fill('')

function winnerOf(board){
  const dirs=[[0,1],[1,0],[1,1],[1,-1]]
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
    const s=board[r*SIZE+c]; if(!s)continue
    for(const[dr,dc]of dirs){
      let ok=true
      for(let k=1;k<WIN;k++){const rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=SIZE||cc<0||cc>=SIZE||board[rr*SIZE+cc]!==s){ok=false;break}}
      if(ok)return s
    }
  }
  return board.every(Boolean)?'D':null
}

function scoreCell(board,i,me,enemy){
  const r=Math.floor(i/SIZE),c=i%SIZE
  let score=30-Math.abs(r-4.5)-Math.abs(c-4.5)
  const dirs=[[0,1],[1,0],[1,1],[1,-1]]
  for(const[dr,dc]of dirs){
    for(let k=1;k<=4;k++){
      for(const sign of[-1,1]){
        const rr=r+dr*k*sign,cc=c+dc*k*sign
        if(rr<0||rr>=SIZE||cc<0||cc>=SIZE)continue
        const v=board[rr*SIZE+cc]
        if(v===me)score+=8/(k)
        if(v===enemy)score+=10/(k)
      }
    }
  }
  return score+Math.random()*2
}

function chooseAI(board){
  const free=board.map((v,i)=>v?null:i).filter(i=>i!==null)
  for(const i of free){const b=[...board];b[i]='O';if(winnerOf(b)==='O')return i}
  for(const i of free){const b=[...board];b[i]='X';if(winnerOf(b)==='X')return i}
  let best=free[0],bestScore=-Infinity
  for(const i of free){const s=scoreCell(board,i,'O','X');if(s>bestScore){bestScore=s;best=i}}
  return best
}

function Avatar({p}){return <div className="tte-avatar">{p?.avatar_url?<img src={p.avatar_url} alt=""/>:(p?.display_name||'?').slice(0,1).toUpperCase()}</div>}

export default function TicTacToeEnhancedOverlay(){
  const[open,setOpen]=useState(false)
  const[mode,setMode]=useState(null)
  const[uid,setUid]=useState(null)
  const[me,setMe]=useState(null)
  const[friends,setFriends]=useState([])
  const[search,setSearch]=useState('')
  const[board,setBoard]=useState(emptyBoard)
  const[aiThinking,setAiThinking]=useState(false)
  const[game,setGame]=useState(null)
  const[moves,setMoves]=useState([])
  const[opponent,setOpponent]=useState(null)
  const[notice,setNotice]=useState('')
  const[incoming,setIncoming]=useState([])

  useEffect(()=>{
    const onClick=e=>{
      if(e.target.closest('.tte-overlay'))return
      const b=e.target.closest('button'); if(!b)return
      if((b.textContent||'').toLowerCase().includes('jogo da velha')){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
        setOpen(true);setMode(null);setNotice('');loadBase()
      }
    }
    document.addEventListener('click',onClick,true)
    return()=>document.removeEventListener('click',onClick,true)
  },[])

  async function loadBase(){
    const{data:{session}}=await supabase.auth.getSession(); const id=session?.user?.id;if(!id)return
    setUid(id)
    const{data:p}=await supabase.from('profiles').select('user_id,display_name,avatar_url,rank_name').eq('user_id',id).single();setMe(p||null)
    const{data:f}=await supabase.from('friendships').select('*').eq('status','accepted').or(`requester_id.eq.${id},addressee_id.eq.${id}`)
    const ids=(f||[]).map(x=>x.requester_id===id?x.addressee_id:x.requester_id)
    if(ids.length){const{data:ps}=await supabase.from('profiles').select('user_id,display_name,avatar_url,rank_name').in('user_id',ids).order('display_name');setFriends(ps||[])}else setFriends([])
    const{data:gp}=await supabase.from('game_players').select('game_id').eq('user_id',id)
    const gids=(gp||[]).map(x=>x.game_id)
    if(gids.length){const{data:gs}=await supabase.from('game_sessions').select('*').in('id',gids).eq('game_type','tic_tac_toe_10x10').eq('status','invited').order('created_at',{ascending:false});setIncoming((gs||[]).filter(g=>(g.state?.player_o||'')===id))}else setIncoming([])
  }

  const outcome=useMemo(()=>mode==='solo'?winnerOf(board):game?.status==='finished'?(game?.winner_id?game.winner_id:'D'):null,[mode,board,game])

  function startSolo(){setMode('solo');setBoard(emptyBoard());setAiThinking(false);setNotice('Você joga com X. Faça 5 em linha para vencer.')}
  function resetSolo(){setBoard(emptyBoard());setAiThinking(false);setNotice('Nova partida iniciada.')}

  function soloPlay(i){
    if(aiThinking||board[i]||winnerOf(board))return
    const next=[...board];next[i]='X';setBoard(next)
    if(winnerOf(next))return
    setAiThinking(true);setNotice('A IA está pensando…')
    setTimeout(()=>{
      const ai=chooseAI(next);if(ai===undefined){setAiThinking(false);return}
      const b=[...next];b[ai]='O';setBoard(b);setAiThinking(false);setNotice(winnerOf(b)?'Partida encerrada.':'Sua vez.')
    },360)
  }

  async function invite(friend){
    setNotice(`Enviando convite para ${friend.display_name}…`)
    const{data,error}=await supabase.rpc('create_ttt_friend_game',{p_friend:friend.user_id})
    if(error){setNotice(error.message);return}
    const{data:g}=await supabase.from('game_sessions').select('*').eq('id',data).single()
    setOpponent(friend);setMode('friend');setGame(g);setMoves([]);setNotice(`Convite enviado para ${friend.display_name}. Aguardando aceitar…`);watchGame(data)
  }

  async function accept(g){
    const{error}=await supabase.rpc('accept_ttt_game',{p_game:g.id});if(error){setNotice(error.message);return}
    const oppId=g.state?.player_x
    const{data:p}=await supabase.from('profiles').select('user_id,display_name,avatar_url,rank_name').eq('user_id',oppId).single()
    setOpponent(p||null);setMode('friend');setGame({...g,status:'active'});setNotice('Partida iniciada. Aguarde sua vez.');loadMoves(g.id);watchGame(g.id)
  }

  async function loadMoves(gameId){const{data}=await supabase.from('ttt_moves').select('*').eq('game_id',gameId).order('move_no');setMoves(data||[])}

  function watchGame(gameId){
    loadMoves(gameId)
    supabase.channel(`tte-${gameId}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'game_sessions',filter:`id=eq.${gameId}`},p=>setGame(p.new))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'ttt_moves',filter:`game_id=eq.${gameId}`},p=>setMoves(v=>v.some(x=>x.id===p.new.id)?v:[...v,p.new].sort((a,b)=>a.move_no-b.move_no)))
      .subscribe()
  }

  useEffect(()=>()=>{supabase.getChannels().filter(c=>c.topic?.startsWith('realtime:tte-')).forEach(c=>supabase.removeChannel(c))},[])

  const friendBoard=useMemo(()=>{const b=emptyBoard();for(const m of moves)b[m.cell]=m.symbol;return b},[moves])
  const myTurn=!!(game&&uid&&game.status==='active'&&game.state?.turn===uid)
  const mySymbol=game?.state?.player_x===uid?'X':'O'

  async function friendPlay(i){
    if(!myTurn||friendBoard[i]||game?.status!=='active')return
    setNotice('Jogada enviada…')
    const{error}=await supabase.rpc('ttt_make_move',{p_game:game.id,p_cell:i})
    if(error)setNotice(error.message);else setNotice('Agora aguarde seu amigo jogar.')
  }

  function close(){setOpen(false);setMode(null);setGame(null);setMoves([]);setNotice('')}
  if(!open)return null
  const filtered=friends.filter(f=>(f.display_name||'').toLowerCase().includes(search.toLowerCase()))
  const displayBoard=mode==='friend'?friendBoard:board

  return <div className="tte-overlay">
    <div className="tte-shell">
      <header className="tte-head"><button onClick={mode?()=>setMode(null):close}><ArrowLeft/></button><div><span>PAI • JOGOS</span><h1>Jogo da Velha 10×10</h1></div><button onClick={close}><X/></button></header>

      {!mode&&<div className="tte-mode-page">
        <section className="tte-hero"><div>❎⭕</div><h2>Como você quer jogar?</h2><p>Tabuleiro 10×10. Vence quem fizer 5 símbolos seguidos.</p></section>
        <div className="tte-mode-grid"><button onClick={startSolo}><Bot/><b>Jogar individual</b><span>Contra uma IA difícil que joga automaticamente após você.</span></button><button onClick={()=>setMode('pick-friend')}><Users/><b>Jogar com amigo</b><span>Convide um amigo e cada jogador joga apenas na própria vez.</span></button></div>
        {!!incoming.length&&<section className="tte-invites"><h3>Convites recebidos</h3>{incoming.map(g=><button key={g.id} onClick={()=>accept(g)}><Gamepad2/><span>Aceitar partida de Jogo da Velha</span><b>Aceitar</b></button>)}</section>}
      </div>}

      {mode==='pick-friend'&&<div className="tte-friends"><div className="tte-friend-title"><UserPlus/><div><h2>Convidar amigo</h2><p>Escolha quem você quer desafiar.</p></div></div><div className="tte-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Procurar amigo"/></div><div className="tte-friend-list">{filtered.map(f=><button key={f.user_id} onClick={()=>invite(f)}><Avatar p={f}/><div><b>{f.display_name}</b><span>{f.rank_name}</span></div><strong>Convidar</strong></button>)}{!filtered.length&&<p>Você ainda não tem amigos disponíveis para convidar.</p>}</div></div>}

      {(mode==='solo'||mode==='friend')&&<div className="tte-game">
        <div className="tte-versus"><div><Avatar p={me}/><b>{me?.display_name||'Você'}</b><span>{mode==='solo'?'X':`Você • ${mySymbol}`}</span></div><strong>VS</strong><div><Avatar p={mode==='solo'?{display_name:'IA'}:opponent}/><b>{mode==='solo'?'IA PAI':opponent?.display_name||'Amigo'}</b><span>{mode==='solo'?'Nível difícil':opponent?.rank_name||'Convidado'}</span></div></div>
        <div className={`tte-turn ${mode==='friend'&&!myTurn?'waiting':''}`}>{outcome?(outcome==='D'?'Empate!':mode==='solo'?`${outcome==='X'?'Você':'IA'} venceu!`:game?.winner_id===uid?'Você venceu!':'Seu amigo venceu!'):mode==='solo'?(aiThinking?'IA jogando…':'Sua vez'):game?.status==='invited'?'Aguardando seu amigo aceitar…':myTurn?'Sua vez':'Vez do seu amigo — aguarde'}</div>
        <div className="tte-board">{displayBoard.map((v,i)=><button key={i} disabled={!!v||!!outcome||(mode==='solo'?aiThinking:!myTurn||game?.status!=='active')} onClick={()=>mode==='solo'?soloPlay(i):friendPlay(i)} className={v==='X'?'x':v==='O'?'o':''}>{v}</button>)}</div>
        <div className="tte-footer"><div className="tte-rule">🏆 Faça 5 em linha • tabuleiro 10×10</div>{notice&&<p>{notice}</p>}<div><button onClick={mode==='solo'?resetSolo:()=>setMode(null)}>{mode==='solo'?'Reiniciar':'Sair da partida'}</button><button onClick={close}>Fechar</button></div></div>
      </div>}
    </div>
  </div>
}
