import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

export default function ChatTimeTracker(){
 const[session,setSession]=useState(null);const roomRef=useRef(null)
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const{data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>l.subscription.unsubscribe()},[])
 useEffect(()=>{if(!session)return;let stopped=false;async function tick(){const{data:m}=await supabase.from('voice_room_members').select('room_id').eq('user_id',session.user.id).is('left_at',null).order('joined_at',{ascending:false}).limit(1).maybeSingle();roomRef.current=m?.room_id||null;if(m?.room_id){await supabase.rpc('claim_chat_milestone_points',{p_room_id:m.room_id,p_minutes:60});await supabase.rpc('claim_chat_milestone_points',{p_room_id:m.room_id,p_minutes:90})}}tick();const id=setInterval(()=>{if(!stopped)tick()},60000);return()=>{stopped=true;clearInterval(id)}},[session?.user?.id])
 return null
}
