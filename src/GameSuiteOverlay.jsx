import {useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {ArrowLeft,RotateCcw} from 'lucide-react'

const Q=[
 {q:'Qual planeta é conhecido como Planeta Vermelho?',a:['Terra','Marte','Júpiter','Vênus'],c:1},
 {q:'Quanto é 7 × 8?',a:['54','56','64','48'],c:1},
 {q:'Qual é a capital do Brasil?',a:['Rio de Janeiro','Brasília','São Paulo','Salvador'],c:1},
 {q:'Quantos lados tem um hexágono?',a:['5','6','7','8'],c:1},
 {q:'A água ferve a quantos °C ao nível do mar?',a:['90','95','100','110'],c:2}
]
const MEM=['🎮','💎','👑','🔥','🎮','💎','👑','🔥']
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}

function Connect4({back}){
 const[board,setBoard]=useState(()=>Array(42).fill(0)),[turn,setTurn]=useState(1)
 const winner=useMemo(()=>{const lines=[];for(let r=0;r<6;r++)for(let c=0;c<7;c++){if(c<4)lines.push([r*7+c,r*7+c+1,r*7+c+2,r*7+c+3]);if(r<3)lines.push([r*7+c,(r+1)*7+c,(r+2)*7+c,(r+3)*7+c]);if(c<4&&r<3)lines.push([r*7+c,(r+1)*7+c+1,(r+2)*7+c+2,(r+3)*7+c+3]);if(c>2&&r<3)lines.push([r*7+c,(r+1)*7+c-1,(r+2)*7+c-2,(r+3)*7+c-3])}for(const l of lines){const v=board[l[0]];if(v&&l.every(i=>board[i]===v))return v}return board.every(Boolean)?3:0},[board])
 function play(c){if(winner)return;for(let r=5;r>=0;r--){const i=r*7+c;if(!board[i]){const n=[...board];n[i]=turn;setBoard(n);setTurn(turn===1?2:1);break}}}
 function reset(){setBoard(Array(42).fill(0));setTurn(1)}
 return <Game title="🔵🔴 Quatro em Linha" back={back}><div className="gso-status">{winner?winner===3?'Empate!':`Jogador ${winner} venceu!`:`Vez do jogador ${turn}`}</div><div className="gso-c4">{board.map((v,i)=><button key={i} onClick={()=>play(i%7)} className={v===1?'p1':v===2?'p2':''}/>)}</div><button className="gso-reset" onClick={reset}><RotateCcw/> Reiniciar</button><div className="gso-reward">🏆 Vitória: +800 pts</div></Game>
}
function Quiz({back}){
 const[i,setI]=useState(0),[score,setScore]=useState(0),[done,setDone]=useState(false),[picked,setPicked]=useState(null)
 function choose(x){if(picked!==null)return;setPicked(x);if(x===Q[i].c)setScore(s=>s+1);setTimeout(()=>{if(i===Q.length-1)setDone(true);else{setI(v=>v+1);setPicked(null)}},450)}
 function reset(){setI(0);setScore(0);setDone(false);setPicked(null)}
 return <Game title="❓ Quiz" back={back}>{done?<div className="gso-finish"><h2>Quiz concluído!</h2><b>{score}/{Q.length} acertos</b><button className="gso-reset" onClick={reset}><RotateCcw/> Jogar novamente</button></div>:<><div className="gso-progress">Pergunta {i+1} de {Q.length}</div><h2 className="gso-question">{Q[i].q}</h2><div className="gso-answers">{Q[i].a.map((a,x)=><button key={a} className={picked===x?(x===Q[i].c?'ok':'bad'):''} onClick={()=>choose(x)}>{a}</button>)}</div><div className="gso-score">Pontuação: {score}</div></>}<div className="gso-reward">🏆 Vitória: +700 pts</div></Game>
}
function Memory({back}){
 const[cards,setCards]=useState(()=>shuffle(MEM).map((v,id)=>({id,v,open:false,done:false}))),[open,setOpen]=useState([]),[moves,setMoves]=useState(0)
 const won=cards.every(c=>c.done)
 function click(id){if(open.length===2)return;const c=cards.find(x=>x.id===id);if(!c||c.open||c.done)return;const next=[...open,id];setCards(v=>v.map(x=>x.id===id?{...x,open:true}:x));setOpen(next);if(next.length===2){setMoves(m=>m+1);const[a,b]=next.map(n=>cards.find(x=>x.id===n));setTimeout(()=>{if(a.v===b.v)setCards(v=>v.map(x=>next.includes(x.id)?{...x,done:true,open:true}:x));else setCards(v=>v.map(x=>next.includes(x.id)?{...x,open:false}:x));setOpen([])},550)}}
 function reset(){setCards(shuffle(MEM).map((v,id)=>({id,v,open:false,done:false})));setOpen([]);setMoves(0)}
 return <Game title="🃏 Memória" back={back}><div className="gso-status">{won?`Você venceu em ${moves} jogadas!`:`Jogadas: ${moves}`}</div><div className="gso-memory">{cards.map(c=><button key={c.id} onClick={()=>click(c.id)} className={c.open||c.done?'open':''}>{c.open||c.done?c.v:'?'}</button>)}</div><button className="gso-reset" onClick={reset}><RotateCcw/> Reiniciar</button><div className="gso-reward">🏆 Vitória: +650 pts</div></Game>
}
function Game({title,back,children}){return <div className="gso-game"><header><button onClick={back}><ArrowLeft/></button><h1>{title}</h1><span/></header>{children}</div>}

export default function GameSuiteOverlay(){
 const[host,setHost]=useState(null),[game,setGame]=useState(null)
 useEffect(()=>{const scan=()=>{const pages=[...document.querySelectorAll('.ra-page')];const p=pages.find(x=>x.offsetParent!==null&&x.querySelector('.ra-title-row h1')?.textContent?.includes('Jogos'));setHost(p||null);if(!p)setGame(null)};scan();const mo=new MutationObserver(scan);mo.observe(document.body,{childList:true,subtree:true,attributes:true});return()=>mo.disconnect()},[])
 if(!host)return null
 const body=game==='connect'?<Connect4 back={()=>setGame(null)}/>:game==='quiz'?<Quiz back={()=>setGame(null)}/>:game==='memory'?<Memory back={()=>setGame(null)}/>:<div className="gso-menu"><h1>🎮 Jogos</h1><div><button onClick={()=>document.querySelector('.ra-game-cards button')?.click()}>❎⭕<b>Jogo da Velha</b><span>Vitória +600 pts</span></button><button onClick={()=>setGame('connect')}>🔵🔴<b>Quatro em Linha</b><span>Vitória +800 pts</span></button><button onClick={()=>setGame('quiz')}>❓<b>Quiz</b><span>Vitória +700 pts</span></button><button onClick={()=>setGame('memory')}>🃏<b>Memória</b><span>Vitória +650 pts</span></button></div></div>
 return createPortal(<><style>{`.gso-root{min-height:100%;color:#fff}.gso-menu h1,.gso-game h1{margin:0}.gso-menu>div{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:18px}.gso-menu button{min-height:170px;border:1px solid #6336b8;border-radius:20px;background:linear-gradient(145deg,#14172f,#090b19);color:#fff;font-size:2rem;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;padding:18px;gap:6px}.gso-menu button b{font-size:1.05rem}.gso-menu button span{font-size:.82rem;color:#aaa9bd}.gso-game header{display:grid;grid-template-columns:46px 1fr 46px;align-items:center;margin-bottom:16px}.gso-game header h1{text-align:center;font-size:1.35rem}.gso-game header button,.gso-reset{border:1px solid #6541b2;background:#171a31;color:#fff;border-radius:12px;padding:10px}.gso-status,.gso-progress,.gso-score,.gso-reward{text-align:center;margin:12px 0;font-weight:800}.gso-c4{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;width:min(520px,100%);margin:auto;padding:10px;background:#132150;border-radius:18px}.gso-c4 button{aspect-ratio:1;border-radius:50%;border:0;background:#090d1c}.gso-c4 button.p1{background:#23a4ff}.gso-c4 button.p2{background:#ff3c70}.gso-reset{display:flex;align-items:center;gap:7px;margin:14px auto}.gso-question{text-align:center;margin:24px auto;max-width:650px}.gso-answers{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:650px;margin:auto}.gso-answers button{padding:16px;border-radius:14px;border:1px solid #4d3b83;background:#12162b;color:#fff}.gso-answers button.ok{background:#145c39}.gso-answers button.bad{background:#6a202c}.gso-finish{text-align:center;display:grid;gap:18px;place-items:center}.gso-memory{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:min(500px,100%);margin:auto}.gso-memory button{aspect-ratio:1;border-radius:16px;border:1px solid #6440b5;background:#161a31;color:#fff;font-size:2rem}.gso-memory button.open{background:#2a2051}@media(max-width:700px){.gso-menu>div{grid-template-columns:1fr 1fr}.gso-menu button{min-height:135px;padding:12px;font-size:1.6rem}.gso-answers{grid-template-columns:1fr}.gso-game header h1{font-size:1.05rem}}`}</style><div className="gso-root">{body}</div></>,host)
}
