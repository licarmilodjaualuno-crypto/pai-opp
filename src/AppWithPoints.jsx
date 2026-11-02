import App2 from './App2'
import PointsCenter from './PointsCenter'
import PhotoViewTracker from './PhotoViewTracker'
import CommunityCenter from './CommunityCenter'
import ProfilePlus from './ProfilePlus'
import VoiceAudioDock from './VoiceAudioDock'
import RoomLiveExtras from './RoomLiveExtras'
import GlobalSearch from './GlobalSearch'
import OwnerControlCenter from './OwnerControlCenter'

export default function AppWithPoints(){
  return <><App2/><PhotoViewTracker/><PointsCenter/><CommunityCenter/><ProfilePlus/><VoiceAudioDock/><RoomLiveExtras/><GlobalSearch/><OwnerControlCenter/></>
}
