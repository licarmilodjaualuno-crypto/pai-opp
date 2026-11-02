import App2 from './App2'
import PointsCenter from './PointsCenter'
import PhotoViewTracker from './PhotoViewTracker'
import CommunityCenter from './CommunityCenter'
import ProfilePlus from './ProfilePlus'
import VoiceAudioDock from './VoiceAudioDock'
import RoomLiveExtras from './RoomLiveExtras'
import GlobalSearch from './GlobalSearch'
import OwnerControlCenter from './OwnerControlCenter'
import ClanManageDock from './ClanManageDock'
import ChatTimeTracker from './ChatTimeTracker'
import GoogleLoginDock from './GoogleLoginDock'
import GamerProfileOverlay from './GamerProfileOverlay'
import './pai-final-theme.css'

export default function AppWithPoints(){
  return <><App2/><GoogleLoginDock/><PhotoViewTracker/><ChatTimeTracker/><PointsCenter/><CommunityCenter/><ProfilePlus/><VoiceAudioDock/><RoomLiveExtras/><GlobalSearch/><OwnerControlCenter/><ClanManageDock/><GamerProfileOverlay/></>
}
