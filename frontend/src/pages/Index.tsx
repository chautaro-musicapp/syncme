
import React, { useState, useEffect } from 'react';
import DetectButton from '@/components/DetectButton';
import RecognitionScreen from '@/components/RecognitionScreen';
import SongResult from '@/components/SongResult';
import RoomScreen from '@/components/RoomScreen';
import Player from '@/components/Player';
import Header from '@/components/Header';
import { generateRoomCode } from '@/utils/mockData';
import { Music } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { verifyYouTubeMatch, searchYouTubeVideo } from '@/utils/musicDetection';
// import { AudioRecognizer } from '@/utils/audioRecognizer';
import { AudioRecognizer } from '@/utils/audioRecognizer'; // Ensure this is the correct path to your AudioRecognizer class

enum AppState {
  HOME,
  DETECTING,
  RESULT,
  ROOM,
  PLAYING
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [isDetecting, setIsDetecting] = useState(false);
  const [recognizedSong, setRecognizedSong] = useState<any | null>(null);
  const [roomCode, setRoomCode] = useState<string | undefined>();
  const [isHost, setIsHost] = useState(false);
  const [videoMode, setVideoMode] = useState(true);
  const [audioRecognizer, setAudioRecognizer] = useState<AudioRecognizer | null>(null);
  const isMobile = useIsMobile();
  
  // Initialize audio recognizer
  useEffect(() => {
    const initRecognizer = async () => {
      const recognizer = new AudioRecognizer();
      const initialized = await recognizer.init();
      if (initialized) {
        setAudioRecognizer(recognizer);
      } else {
        toast({
          title: "Audio Access Error",
          description: "Please allow microphone access to detect music",
          variant: "destructive"
        });
      }
    };
    
    initRecognizer();
    
    // Cleanup on unmount
    return () => {
      if (audioRecognizer) {
        audioRecognizer.cleanup();
      }
    };
  }, []);
  
  // Start the detection process
  const handleDetect = () => {
    if (!audioRecognizer) {
      toast({
        title: "Not Ready",
        description: "Audio recognition system is still initializing",
        variant: "destructive"
      });
      return;
    }
    
    setIsDetecting(true);
    setAppState(AppState.DETECTING);
  };
  
  // Called when the waveform animation should start - begins actual audio recording
  const startListening = async () => {
    if (!audioRecognizer) return;
    
    try {
      await audioRecognizer.startRecording();
      console.log("Started recording audio for music detection...");
      
      // Automatically stop recording after 10 seconds
      setTimeout(async () => {
        if (isDetecting) {
          const audioBlob = await audioRecognizer.stopRecording();
          if (audioBlob) {
            processAudioRecording(audioBlob);
          }
        }
      }, 10000);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      handleCancelDetection();
      toast({
        title: "Recording Error",
        description: "Unable to record audio. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Process the recorded audio blob
  const processAudioRecording = async (audioBlob: Blob) => {
    if (!audioRecognizer) return;
    
    try {
      toast({
        title: "Processing",
        description: "Analyzing the recorded audio...",
      });
      
      const recognizedSongData = await audioRecognizer.recognizeSong(audioBlob);
      
      if (recognizedSongData) {
        // Format the song data to match our app's expected structure
        const songData = {
          title: recognizedSongData.title,
          artist: recognizedSongData.artist,
          album: recognizedSongData.album || "",
          releaseYear: recognizedSongData.releaseDate ? 
            new Date(recognizedSongData.releaseDate).getFullYear() : undefined,
          coverArt: recognizedSongData.albumArt,
          youtubeId: "", // Will be filled by our YouTube search
          isVerified: false,
        };
        
        // Use our existing YouTube matching logic
        handleSongRecognized(songData);
      } else {
        toast({
          title: "No Match Found",
          description: "We couldn't identify the song. Please try again.",
          variant: "destructive"
        });
        handleCancelDetection();
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Processing Error",
        description: "Error analyzing the audio. Please try again.",
        variant: "destructive"
      });
      handleCancelDetection();
    }
  };
  
  // Enhanced string sanitization to handle special characters better
  const sanitizeQueryString = (str: string) => {
    if (!str) return '';
    
    return str
      .replace(/[\u{0080}-\u{FFFF}]/gu, '') // Remove non-ASCII chars that might cause issues
      .replace(/[^\w\s&'-]/g, '') // Keep apostrophes, ampersands and hyphens (common in music titles)
      .replace(/\s+/g, ' ')     // Collapse multiple spaces
      .trim();
  };
  
  // Improved search query builder with more precise queries
  const buildEnhancedSearchQueries = (song: any) => {
    const cleanArtist = sanitizeQueryString(song.artist);
    const cleanTitle = sanitizeQueryString(song.title);
    const albumInfo = song.album ? ` ${sanitizeQueryString(song.album)}` : '';
    const yearSuffix = song.releaseYear ? ` ${song.releaseYear}` : '';
    const featuredArtists = song.featuredArtists?.map(sanitizeQueryString).join(' ') || '';
  
    // Start with most specific queries
    return [
      // Official content with exact artist and title format
      `${cleanArtist} - ${cleanTitle} official music video${yearSuffix}`,
      `${cleanArtist} - ${cleanTitle} official audio${yearSuffix}`,
      
      // Add featured artists for more specificity
      ...(featuredArtists ? [
        `${cleanArtist} feat. ${featuredArtists} - ${cleanTitle} official${yearSuffix}`,
        `${cleanArtist} featuring ${featuredArtists} - ${cleanTitle}${yearSuffix}`
      ] : []),
      
      // Include streaming service keywords that often have good quality matches
      `${cleanArtist} - ${cleanTitle} audio${yearSuffix}`,
      `${cleanArtist} - ${cleanTitle} provided to youtube${yearSuffix}`,
      
      // Include album info for better accuracy
      ...(song.album ? [
        `${cleanArtist} - ${cleanTitle}${albumInfo}${yearSuffix}`,
        `${cleanArtist} - ${cleanTitle} from ${albumInfo}${yearSuffix}`
      ] : []),
      
      // Try with VEVO which often has official content
      `${cleanArtist} ${cleanTitle} vevo${yearSuffix}`,
      
      // Various other formats that might match
      `${cleanTitle} by ${cleanArtist} lyrics${yearSuffix}`,
      `${cleanArtist} ${cleanTitle} lyrics${yearSuffix}`,
      `${cleanTitle} ${cleanArtist} topic${yearSuffix}`, // YouTube auto-generated channels
      
      // Last resort queries
      `${cleanArtist} ${cleanTitle}${yearSuffix}`,
      `${cleanTitle} ${cleanArtist}${yearSuffix}`
    ].filter(q => q.trim() !== ''); // Remove any empty queries
  };
  
  // Helper functions for verification
  const normalizeString = (str: string): string => {
    if (!str) return '';
    
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  };
  
  // Simple Levenshtein distance-based similarity score
  const calculateSimilarityScore = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    
    const norm1 = normalizeString(str1);
    const norm2 = normalizeString(str2);
    
    // Check if str2 is completely contained in str1 (strong match)
    if (norm1.includes(norm2)) return 0.9;
    
    // Calculate Levenshtein distance
    const distance = levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    
    // Convert to similarity score (0-1)
    return Math.max(0, 1 - (distance / maxLength));
  };
  
  // Levenshtein distance implementation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    
    // Create a matrix of size (m+1) x (n+1)
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost  // substitution
        );
      }
    }
    
    return dp[m][n];
  };
  
  // Mock function to fetch YouTube video metadata - replace with actual implementation
  const fetchYouTubeVideoMetadata = async (videoId: string) => {
    // This would be replaced with an actual API call to fetch YouTube video data
    try {
      // Example implementation using YouTube Data API:
      // const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=YOUR_API_KEY`);
      // const data = await response.json();
      // return data.items[0]?.snippet;
      
      // For now, use the existing verification function to get some data
      // In a real implementation, you'd want to get actual metadata from YouTube
      const isVerified = await verifyYouTubeMatch(videoId, "", "");
      
      // Return a basic structure with limited info
      return {
        title: videoId, // This would normally be the actual title from YouTube
        description: "", 
        channelTitle: ""
      };
    } catch (error) {
      console.error("Error fetching video metadata:", error);
      return null;
    }
  };
  
  // Enhanced verification function with multiple checks
  const enhancedVerifyYouTubeMatch = async (
    videoId: string, 
    artist: string, 
    title: string, 
    additionalInfo?: { album?: string, releaseYear?: number }
  ): Promise<boolean> => {
    try {
      // First try the existing verification function as a baseline
      const basicVerified = await verifyYouTubeMatch(videoId, artist, title);
      if (basicVerified) return true;
      
      // Get video metadata from YouTube
      const videoData = await fetchYouTubeVideoMetadata(videoId);
      
      if (!videoData) return false;
      
      // Clean up strings for better comparison
      const normalizedVideoTitle = normalizeString(videoData.title);
      const normalizedArtist = normalizeString(artist);
      const normalizedTitle = normalizeString(title);
      
      // Simple exact match check
      const exactMatch = normalizedVideoTitle.includes(normalizedArtist) && 
                         normalizedVideoTitle.includes(normalizedTitle);
      
      if (exactMatch) return true;
      
      // Advanced matching logic - calculate similarity scores
      const artistMatchScore = calculateSimilarityScore(normalizedVideoTitle, normalizedArtist);
      const titleMatchScore = calculateSimilarityScore(normalizedVideoTitle, normalizedTitle);
      
      // Combined match threshold - adjust these thresholds based on testing
      const combinedScore = (artistMatchScore * 0.4) + (titleMatchScore * 0.6);
      
      // Check for "official" or "lyrics" keywords as positive signals
      const hasOfficialKeyword = normalizedVideoTitle.includes('official') || 
                                 normalizedVideoTitle.includes('vevo');
      
      const hasLyricsKeyword = normalizedVideoTitle.includes('lyrics') || 
                               normalizedVideoTitle.includes('lyric video');
                               
      const hasTopicKeyword = normalizedVideoTitle.includes('topic');
      
      // Verify using multiple criteria
      if (combinedScore > 0.85) return true;
      if (combinedScore > 0.75 && (hasOfficialKeyword || hasLyricsKeyword)) return true;
      if (combinedScore > 0.7 && hasTopicKeyword) return true; // "Topic" channels are usually auto-generated and reliable
      
      // Additional checks for album match if available
      if (additionalInfo?.album && 
          normalizedVideoTitle.includes(normalizeString(additionalInfo.album)) && 
          combinedScore > 0.6) {
        return true;
      }
      
      // Check channel name for artist match as a strong signal
      if (videoData.channelTitle && 
          calculateSimilarityScore(normalizeString(videoData.channelTitle), normalizedArtist) > 0.8 && 
          titleMatchScore > 0.7) {
        return true;
      }
      
      // If all checks fail, it's probably not a good match
      return false;
      
    } catch (error) {
      console.error("Error in enhanced verification:", error);
      return false;
    }
  };
  
  const handleSongRecognized = async (song: any) => {
    console.log("Song recognized:", song);
  
    toast({
      title: "Searching YouTube...",
      description: "Trying to find the song...",
    });
  
    try {
      // Combine artist and title for basic search
      const basicQuery = `${song.artist} - ${song.title}`;
  
      // Search YouTube
      const youtubeId = await searchYouTubeVideo(basicQuery, song.artist, song.title);
  
      if (!youtubeId) {
        toast({
          title: "No YouTube Result",
          description: "Couldn't find a video for the recognized song.",
          variant: "destructive"
        });
        handleCancelDetection();
        return;
      }
  
      // Assign the found video ID directly
      const updatedSong = {
        ...song,
        youtubeId,
        isVerified: false,
        matchConfidence: 1.0, // Since we're skipping scoring
      };
  
      setRecognizedSong(updatedSong);
      setIsDetecting(false);
      setAppState(AppState.RESULT);
  
      toast({
        title: `Song Found!`,
        description: `${updatedSong.title} by ${updatedSong.artist}`,
      });
  
    } catch (error) {
      console.error("Error finding YouTube video:", error);
      toast({
        title: "Search Error",
        description: "Error finding the video. Please try again.",
        variant: "destructive"
      });
      handleCancelDetection();
    }
  };
  
  
  const handleCancelDetection = async () => {
    // If we're recording, stop the recording
    if (audioRecognizer && isDetecting) {
      await audioRecognizer.stopRecording();
    }
    
    setIsDetecting(false);
    setAppState(AppState.HOME);
  };
  
  const handlePlay = () => {
    if (!recognizedSong || !recognizedSong.youtubeId) {
      toast({
        title: "Playback Error",
        description: "No valid song recognized yet. Please detect a song first.",
        variant: "destructive"
      });
      return;
    }
  
    setVideoMode(true);
    setAppState(AppState.PLAYING);
    setIsHost(true);
  };
  
  const handleAudioOnly = () => {
    setVideoMode(false);
    setAppState(AppState.PLAYING);
    setIsHost(true);
  };
  
  const handleVibeTogether = () => {
    setAppState(AppState.ROOM);
  };
  
  const handleCreateRoom = () => {
    setRoomCode(generateRoomCode());
    setIsHost(true);
  };
  
  const handleJoinRoom = (code: string) => {
    setRoomCode(code);
    setIsHost(false);
    setAppState(AppState.PLAYING);
  };
  
  const handleBackToHome = () => {
    setAppState(AppState.HOME);
    setRoomCode(undefined);
    setIsHost(false);
  };

  return (
    <div className="flex flex-col min-h-screen space-bg cosmic-dots overflow-hidden">
      {appState === AppState.HOME && (
        <>
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
            {/* Floating music emojis */}
            <div className="absolute top-10 left-[10%] text-2xl opacity-20 float-slow">🎵</div>
            <div className="absolute top-[15%] right-[15%] text-3xl opacity-15 float">🎶</div>
            <div className="absolute bottom-[20%] left-[20%] text-xl opacity-20 float-fast">🎧</div>
            <div className="absolute bottom-[30%] right-[10%] text-2xl opacity-10 float-slow">🎤</div>
            
            <div className="text-center mb-10 animate-fade-in max-w-md">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-syncme-light-purple rounded-full blur-xl opacity-30"></div>
                  <div className="bg-gradient-to-br from-syncme-light-purple to-syncme-purple p-5 rounded-full relative z-10">
                    <Music className="h-12 w-12 text-white" />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-300 to-blue-300 text-transparent bg-clip-text drop-shadow-md">
                Sync<span className="text-syncme-light-purple">Me</span> 
              </h1>
              <p className="text-blue-200/80 mb-2">
                Detect, play, and share music in real-time ✨
              </p>
              <p className="text-blue-200/50 text-sm mt-2 max-w-xs mx-auto">
                Let's bring your music experience to the next level
              </p>
            </div>
            
            <div className="relative">
              <DetectButton 
                onDetect={handleDetect} 
                isDetecting={isDetecting}
                startListening={startListening}
              />
            </div>
            
            <div className="mt-12 text-center animate-fade-in bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 max-w-xs">
              <h2 className="font-medium mb-2 text-blue-200">How it works</h2>
              <ol className="text-blue-200/70 space-y-2 text-sm text-left">
                <li className="flex items-center"><span className="mr-2 bg-syncme-light-purple/20 w-6 h-6 rounded-full flex items-center justify-center">1</span> Tap to detect music playing around you 🎵</li>
                <li className="flex items-center"><span className="mr-2 bg-syncme-light-purple/20 w-6 h-6 rounded-full flex items-center justify-center">2</span> Choose to play solo or vibe with friends 👥</li>
                <li className="flex items-center"><span className="mr-2 bg-syncme-light-purple/20 w-6 h-6 rounded-full flex items-center justify-center">3</span> Create or join a room to sync music 🚀</li>
              </ol>
            </div>
          </main>
        </>
      )}
      
      {appState === AppState.DETECTING && (
        <RecognitionScreen 
          isListening={isDetecting} 
          onCancel={handleCancelDetection}
          onSongRecognized={handleSongRecognized}
        />
      )}
      
      {appState === AppState.RESULT && (
        <div className="min-h-screen flex flex-col space-bg cosmic-dots">
          <Header 
            title="Song Recognized ✓" 
            showBackButton={true} 
            onBackClick={() => setAppState(AppState.HOME)}
          />
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <SongResult 
              song={recognizedSong}
              onPlay={handlePlay}
              onVibeTogether={handleVibeTogether}
            />
          </div>
        </div>
      )}
      
      {appState === AppState.ROOM && (
        <RoomScreen 
          roomCode={roomCode}
          isHost={isHost}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onClose={() => setAppState(AppState.PLAYING)}
        />
      )}
      
      {appState === AppState.PLAYING && (
        <Player 
          song={recognizedSong}
          isHost={isHost}
          roomCode={roomCode}
          participants={3}
          onBack={handleBackToHome}
        />
      )}
    </div>
  );
};

export default Index;