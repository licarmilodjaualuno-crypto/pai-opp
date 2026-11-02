import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Radio, Volume2, X } from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { supabase } from './lib/supabase'
import './voiceaudio.css'

export default function VoiceAudioDock(){
 const[session,setSession]=useState(null),[membership,setMembership]=useState(null),[roomInfo,setRoomInfo]=useState(null),[connected,setConnected]=useState(false),[muted,setMuted]=useState(false),[msg,setMsg]=useState('')
 const roomRef=useRef(null),audioRef=useRef(null)
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)loadMembership(data.session.user.id)});const{data:l}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s)loadMembership(s.user.id)});return()=>l.subscription.unsubscribe()},[])
 async function loadMembership(uid){const{data:m}=await supabase.from('voice_room_members').select('*').eq('user_id',uid).is('left_at',null).order('joined_at',{ascending:false}).limit(1).maybeSingle();setMembership(m||null);if(m){const{data:r}=await supabase.from('voice_rooms').select('id,title,room_type,active').eq('id',m.room_id).maybeSingle();setRoomInfo(r||null)}else setRoomInfo(null)}
 useEffect(()=>{if(!session)return;const ch=supabase.channel(`voice-dock-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'voice_room_members',filter:`user_id=eq.${session.user.id}`},()=>loadMembership(session.user.id)).subscribe();return()=>supabase.removeChannel(ch)},[session?.user?.id])
 useEffect(()=>()=>disconnect(),[])
 async function connect(){if(!membership||connected)return;setMsg('Conectando áudio...');const{data,error}=await supabase.functions.invoke('voice-token',{body:{room_id:membership.room_id}});if(error||!data?.token){setMsg(data?.error==='voice_provider_not_configured'?'Servidor de áudio ainda precisa das credenciais do provedor SFU.':error?.message||data?.error||'Não foi possível conectar o áudio.');return}
  try{const room=new Room({adaptiveStream:true,dynacast:true});roomRef.current=room;room.on(RoomEvent.TrackSubscribed,(track)=>{if(track.kind===Track.Kind.Audio){const el=track.attach();el.autoplay=true;audioRef.current?.appendChild(el)}});room.on(RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(el=>el.remove()));room.on(RoomEvent.Disconnected,()=>setConnected(false));await room.connect(data.url,data.token);if(data.canPublish)await room.localParticipant.setMicrophoneEnabled(true);setMuted(false);setConnected(true);setMsg(data.canPublish?'Microfone conectado ao palco.':'Você está ouvindo como espectador.')}catch(e){setMsg(e.message||'Falha ao conectar o áudio.');disconnect()}}
 async function toggleMic(){const room=roomRef.current;if(!room)return;const next=!muted;await room.localParticipant.setMicrophoneEnabled(!next);setMuted(next)}
 function disconnect(){try{roomRef.current?.disconnect()}catch{}roomRef.current=null;setConnected(false);if(audioRef.current)audioRef.current.innerHTML=''}
 if(!session||!membership||!roomInfo?.active)return null
 const speaker=membership.seat_number!=null
 return <div className="voice-audio-dock"><div className="voice-audio-main"><Radio size={17}/><div><b>{roomInfo.title}</b><span>{speaker?`Palco • lugar ${membership.seat_number}`:'Espectador'}</span></div></div>{msg&&<small>{msg}</small>}<div className="voice-audio-actions">{!connected?<button onClick={connect}><Volume2/> Conectar áudio</button>:<>{speaker&&<button onClick={toggleMic}>{muted?<MicOff/>:<Mic/>}{muted?'Ativar':'Mutar'}</button>}<button onClick={disconnect}><X/> Desconectar</button></>}</div><div ref={audioRef} className="remote-audio"/></div>
}
