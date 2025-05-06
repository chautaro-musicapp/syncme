
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Video, ExternalLink } from 'lucide-react';
import Header from './Header';
import YouTube from 'react-youtube';
import { toast } from "@/hooks/use-toast";
// import { SocketContext } from '@/context/socket';
import { useSocket } from '@/context/socket';

interface PlayerProps {
  song: {
    title: string;
    artist: string;
    albumArt: string;
    youtubeId?: string;
    isVerified?: boolean;
  };
  isHost: boolean;
  roomCode?: string;
  participants?: number;
  onBack: () => void;
}


const Player: React.FC<PlayerProps> = ({ 
  song, 
  isHost, 
  roomCode, 
  participants = 1,
  onBack 
}) => {

  const { socket } = useSocket(); 
  const [videoId, setVideoId] = useState<string | undefined>(song.youtubeId);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [videoMode, setVideoMode] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [songTitle, setSongTitle] = useState('');
  const [roomUsers, setRoomUsers] = useState(participants);
  const playerRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  const [messages, setMessages] = useState<Array<{
    sender: string;
    content: string;
    timestamp: Date;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username] = useState(() => `User${Math.floor(Math.random() * 1000)}`);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !roomCode) return;

    const messageData = {
      roomCode,
      sender: username,
      content: newMessage.trim()
    };

    // Optimistic update
    setMessages(prev => [...prev, {
      ...messageData,
      timestamp: new Date()
    }]);
    
    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  // Socket.io integration
  useEffect(() => {
    if (!socket || !roomCode) return;

    // Join room
    socket.emit('join_room', { roomCode, isHost });

    // Listen for room updates
    socket.on('room_update', (users) => {
      setRoomUsers(users);
    });

    // Host events
    if (isHost) {
      socket.on('request_sync', (clientId) => {
        socket.emit('host_update', {
          roomCode,
          clientId,
          isPlaying,
          currentTime: playerRef.current?.getCurrentTime() || 0
        });
      });
    } 
    // Client events
    else {
      socket.on('host_play', () => {
        playerRef.current?.playVideo();
        setIsPlaying(true);
      });

      socket.on('host_pause', () => {
        playerRef.current?.pauseVideo();
        setIsPlaying(false);
      });

      socket.on('host_seek', (time) => {
        playerRef.current?.seekTo(time, true);
        setCurrentTime(time);
      });

      socket.on('force_sync', ({ isPlaying, currentTime }) => {
        playerRef.current?.seekTo(currentTime, true);
        if (isPlaying) {
          playerRef.current?.playVideo();
        } else {
          playerRef.current?.pauseVideo();
        }
        setIsSynced(true);
      });
    }

    return () => {
      socket?.off('room_update');
      socket?.off('host_play');
      socket?.off('host_pause');
      socket?.off('host_seek');
      socket?.emit('leave_room', roomCode);
    };
  }, [socket, roomCode, isHost]);

  // Host time sync
  useEffect(() => {
    if (!isHost || !socket || !roomCode) return;

    const syncInterval = setInterval(() => {
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      socket.emit('time_update', { roomCode, currentTime });
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [isHost, socket, roomCode]);

  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setSongTitle('');
    setVideoId(song.youtubeId);

    if (song.youtubeId && song.youtubeId !== videoId) {
      setVideoId(song.youtubeId);
    }
  }, [song.title, song.artist, song.youtubeId]);

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
    
    if (!isHost) {
      socket?.emit('request_sync', roomCode);
    }

    if (isPlaying) {
      try {
        playerRef.current.playVideo();
      } catch (err) {
        console.error("Error starting playback:", err);
      }
    }

    const intervalId = setInterval(() => {
      if (playerRef.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime() || 0;
          const duration = playerRef.current.getDuration() || 0;
          setCurrentTime(currentTime);
          setDuration(duration);
          setProgress((currentTime / duration) * 100);
        } catch (err) {
          console.error("Error updating progress:", err);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  };

  const onStateChange = (event: any) => {
    const playerState = event.data;
    
    if (playerState === 1) {
      setIsPlaying(true);
      
      if (!songTitle && playerRef.current) {
        try {
          const videoData = playerRef.current.getVideoData();
          if (videoData && videoData.title) {
            setSongTitle(videoData.title);
          }
        } catch (e) {
          console.log("Couldn't get video data:", e);
        }
      }
    } else if (playerState === 2) {
      setIsPlaying(false);
    } else if (playerState === 0) {
      setIsPlaying(false);
    }
  };

  const onPlayerError = (event: any) => {
    console.error("YouTube player error:", event);
    toast({
      title: "Playback Error",
      description: "Looking for an alternative source...",
      variant: "default"
    });
  };

  const togglePlayPause = () => {
    if (!isHost) return;

    if (playerRef.current) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
          socket?.emit('pause', roomCode);
        } else {
          playerRef.current.playVideo();
          socket?.emit('play', roomCode);
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error("Error toggling play/pause:", error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const toggleVideoMode = () => {
    setVideoMode(!videoMode);
  };

  const playerHeight = videoMode ? Math.min(containerWidth * 0.5625, 360) : 0;
  const playerOptions = {
    height: playerHeight,
    width: '100%',
    playerVars: {
      autoplay: isPlaying ? 1 : 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      fs: 0
    }
  };

  // Add this inside your main socket useEffect, after the existing socket.on() calls
useEffect(() => {
  if (!socket) return;

  // ... existing socket code ...

  // Chat message handlers
  const handleReceiveMessage = (message: {
    sender: string;
    content: string;
    timestamp: Date;
  }) => {
    setMessages(prev => [...prev, message]);
  };

  const handleChatHistory = (history: Array<{
    sender: string;
    content: string;
    timestamp: Date;
  }>) => {
    setMessages(history);
  };

  socket.on('receive_message', handleReceiveMessage);
  socket.on('chat_history', handleChatHistory);

  if (roomCode) {
    socket.emit('request_chat_history', roomCode);
  }

  return () => {
    // ... existing cleanup ...
    socket.off('receive_message', handleReceiveMessage);
    socket.off('chat_history', handleChatHistory);
  };
}, [socket, roomCode]); // Add roomCode to dependency array

  return (
    <div className="flex flex-col h-full space-bg cosmic-dots animate-fade-in">
      <Header title={roomCode ? `Room: ${roomCode}` : "Now Playing 🎵"} showBackButton={true} onBackClick={onBack} />
      
      {roomCode && (
        <div className="flex items-center justify-between px-4 py-2 bg-syncme-light-purple/10 backdrop-blur-md border-b border-syncme-light-purple/10">
          <div className="flex items-center">
            <div className="emoji-bg mr-2 w-8 h-8">
              <span className="text-lg">👥</span>
            </div>
            <span className="text-sm text-blue-200">{roomUsers} listener{roomUsers !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-4">
            {isHost && <span className="text-xs bg-syncme-orange px-2 py-1 rounded-full">🎮 Host</span>}
            <div className="text-xs">
              {isSynced ? (
                <span className="text-green-400">✔ Synced</span>
              ) : (
                <span className="text-yellow-400 animate-pulse">⟳ Syncing</span>
              )}
            </div>
            <button 
              onClick={() => setShowChat(!showChat)}
              className="flex items-center text-sm text-blue-200"
            >
              <div className="emoji-bg mr-2 w-8 h-8">
                <span className="text-lg">💬</span>
              </div>
              Chat
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-8 relative">
        <div className="absolute top-10 left-[10%] text-xl opacity-10 float-slow">🎵</div>
        <div className="absolute top-[15%] right-[15%] text-xl opacity-10 float">🎶</div>
        <div className="absolute bottom-[20%] left-[20%] text-xl opacity-10 float-fast">🎧</div>
        
        <div className="w-full mb-6 overflow-hidden rounded-lg shadow-[0_0_30px_rgba(155,135,245,0.2)] border border-syncme-light-purple/10">
          {videoId ? (
            videoMode ? (
              <div className="w-full" style={{ height: playerHeight }}>
                <YouTube
                  videoId={videoId}
                  opts={playerOptions}
                  onReady={onPlayerReady}
                  onStateChange={onStateChange}
                  onError={onPlayerError}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center text-blue-200 w-full h-16 bg-syncme-dark/80">
                <Music className="mr-2" size={20} />
                <span>Playing audio only</span>
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-200/50 bg-syncme-dark/80 min-h-[120px]">
              <p>No YouTube video available</p>
            </div>
          )}
        </div>
        
        <div className="w-full flex justify-center mb-4">
          <button
            onClick={toggleVideoMode}
            className={`flex items-center px-4 py-2 rounded-full border ${videoMode ? 'bg-syncme-light-purple text-white border-syncme-light-purple' : 'bg-syncme-dark/40 text-blue-200 border-syncme-light-purple/30'}`}
          >
            {videoMode ? (
              <>
                <Video size={16} className="mr-2" />
                Video Mode
              </>
            ) : (
              <>
                <Music size={16} className="mr-2" />
                Audio Only
              </>
            )}
          </button>
        </div>
        
        <div className="w-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <span className="mr-2">🎵</span> {song.title}
            </h2>
            <p className="text-blue-200/80 flex items-center">
              <span className="mr-2">👨‍🎤</span> {song.artist}
            </p>
            {songTitle && (
              <p className="text-xs text-blue-200/50 mt-1">
                Playing: {songTitle}
              </p>
            )}
            {videoId && (
              <a 
                href={`https://www.youtube.com/watch?v=${videoId}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs flex items-center text-syncme-light-purple hover:underline mt-1"
              >
                <ExternalLink size={12} className="mr-1" />
                Open on YouTube
              </a>
            )}
          </div>
          
          <div className="w-full h-2 bg-syncme-light-purple/10 rounded-full mb-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-syncme-light-purple to-syncme-purple rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-blue-200/70 mb-6">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          <div className="flex items-center justify-center space-x-8">
            <button 
              className={`text-blue-200/70 hover:text-white transition-colors ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isHost}
            >
              <SkipBack size={28} />
            </button>
            
            <button 
              onClick={togglePlayPause}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors shadow-[0_0_20px_rgba(155,135,245,0.5)] ${
                isHost 
                  ? 'bg-syncme-light-purple hover:bg-syncme-purple cursor-pointer'
                  : 'bg-gray-500 cursor-not-allowed'
              }`}
              disabled={!isHost}
            >
              {isPlaying ? <Pause size={30} /> : <Play size={30} />}
            </button>
            
            <button 
              className={`text-blue-200/70 hover:text-white transition-colors ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isHost}
            >
              <SkipForward size={28} />
            </button>
          </div>
        </div>
      </div>

    {showChat && (
  <div className="fixed inset-0 z-50 space-bg cosmic-dots animate-slide-up flex flex-col">
    <Header title="Room Chat 💬" showBackButton={false} />
    
    <div className="flex-1 p-4 overflow-y-auto">
      {messages.map((message) => (
        <div 
          key={message.timestamp.getTime()} // Use timestamp as unique key
          className={`bg-syncme-dark/40 backdrop-blur-md rounded-lg p-4 border border-syncme-light-purple/10 mb-4 ${
            message.sender === username ? 'ml-auto max-w-[80%] border-syncme-light-purple/30' : ''
          } transition-all duration-200`}
        >
          <div className="flex items-center justify-between text-xs text-blue-200/50 mb-1">
            <span>{message.sender === username ? 'You' : message.sender}</span>
            <span className="text-xs text-blue-200/30">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <p className="text-blue-200 break-words">{message.content}</p>
        </div>
      ))}
    </div>

    <div className="p-4 bg-syncme-dark/80 backdrop-blur-lg border-t border-syncme-light-purple/10">
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 p-3 rounded-lg bg-syncme-dark/50 text-white border border-syncme-light-purple/20 focus:outline-none focus:ring-1 focus:ring-syncme-light-purple/50"
          maxLength={500}
          aria-label="Type your message"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-lg bg-syncme-light-purple text-white hover:bg-syncme-purple transition-colors disabled:opacity-50 flex items-center justify-center"
          disabled={!newMessage.trim()}
        >
          <span>Send</span>
        </button>
      </form>
      <button 
        onClick={() => setShowChat(false)}
        className="w-full mt-4 py-2 text-blue-200/70 hover:text-white bg-syncme-dark/40 rounded-lg border border-syncme-light-purple/10 transition-colors"
      >
        Close Chat
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default Player;