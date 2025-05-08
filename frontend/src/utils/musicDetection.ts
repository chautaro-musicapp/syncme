

import { toast } from "@/hooks/use-toast";

interface AuddResponse {
  status: string;
  result?: {
    title: string;
    artist: string;
    album: string;
    release_date: string;
    label: string;
    timecode: string;
    song_link: string;
    duration?: number;
    apple_music?: {
      artwork?: {
        url?: string;
      };
    };
  };
}

// Convert the API response to our Song format
export const convertAuddResultToSong = (result: AuddResponse['result']) => {
  if (!result) return null;
  
  const albumArt = result.apple_music?.artwork?.url?.replace('{w}x{h}', '500x500') || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(result.title)}&background=8B5CF6&color=fff&size=256`;
  
  return {
    title: result.title,
    artist: result.artist,
    album: result.album || 'Unknown Album',
    albumArt,
    year: result.release_date?.split('-')[0] || 'Unknown',
    duration: result.duration || 0,
    youtubeId: null,
    isVerified: false,
  };
};

const recentlyUsedFallbackIds = new Set<string>();

const getDurationBucket = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return minutes <= 4 ? 'short' : minutes <= 20 ? 'medium' : 'long';
};

// Expanded list for most popular songs
const popularSongs: Record<string, Record<string, string>> = {
  'Billie Eilish': {
    'BIRDS OF A FEATHER': 'Ah0Ys50CqO8',
    'Bad Guy': 'DyDfgMOUjCI',
    'Happier Than Ever': '5GJWxDKyk3A',
    'when the partys over': 'pbMwTqkKSps',
    'Ocean Eyes': 'viimfQi_pUw'
  },
  'Taylor Swift': {
    'Blank Space': 'e-ORhEE9VVg',
    'Anti-Hero': 'b1kbLwvqugk',
    'Cruel Summer': 'ic8j13piAhQ',
    'Shake It Off': 'nfWlot6h_JM',
    'Love Story': 'V9ZiklE2Q8k'
  },
  'The Weeknd': {
    'Blinding Lights': 'XXYlFuWEuKI',
    'Save Your Tears': 'LIIDh-qI9oI',
    'Starboy': 'dqRZDebPIGs',
    'The Hills': 'yzTuBuRdAyA',
    'Die For You': 'vYMR3lku5Vg'
  },
  'Ed Sheeran': {
    'Shape of You': 'JGwWNGJdvx8',
    'Perfect': '2Vv-BfVoq4g',
    'Thinking Out Loud': 'lp-EO5I60KA',
    'Photograph': 'nSDgHBxUbVQ',
    'Bad Habits': 'orJSJGHjBLI'
  },
  'Adele': {
    'Hello': 'YQHsXMglC9A',
    'Rolling in the Deep': 'rYEDA3JcQqw',
    'Someone Like You': 'hLQl3WQQoQ0',
    'Easy On Me': 'U3ASj1L6_sY',
    'Set Fire to the Rain': 'Ri7-vnrJD3k'
  },
  'Harry Styles': {
    'As It Was': 'H5v3kku4y6Q',
    'Watermelon Sugar': 'E07s5ZYygMg',
    'Late Night Talking': 'jjf-0O4N3I0',
    'Adore You': 'VF-r5TtlT9w',
    'Golden': 'P3cffdsEXXw'
  },
  'Dua Lipa': {
    'Levitating': 'TUVcZfQe-Kw',
    'Don\'t Start Now': 'oygrmJFKYZY',
    'New Rules': 'k2qgadSvNyU',
    'Physical': '9HDEHj2yzew',
    'Break My Heart': 'Nj2U6rhnucI'
  },
  'Bruno Mars': {
    'The Lazy Song': 'fLexgOxsZu0',
    'Just The Way You Are': 'LjhCEhWiKXk',
    'Uptown Funk': 'OPf0YbXqDm0',
    'That\'s What I Like': 'PMivT7MJ41M',
    'When I Was Your Man': 'ekzHIouo8Q4'
  },
  'Coldplay': {
    'Yellow': 'yKNxeF4KMsY',
    'Viva La Vida': 'dvgZkm1xWPE',
    'A Sky Full of Stars': 'VPRjCeoBqrI',
    'Fix You': 'k4V3Mo61fJM',
    'Paradise': '1G4isv_Fylg'
  },
  'Justin Bieber': {
    'Sorry': 'fRh_vgS2dFE',
    'What Do You Mean?': 'DK_0jXPuIr0',
    'Love Yourself': 'oyEuk8j8imI',
    'Stay': 'yWEK4JbyF9k',
    'Ghost': 'Fp8msa5McBk'
  },
  'Drake': {
    'God\'s Plan': 'xpVfcZ0ZcFM',
    'Hotline Bling': 'uxpDa-c-4Mc',
    'In My Feelings': 'DRS_PpOrUZ4',
    'Started From the Bottom': 'RubBzkZzpUA',
    'One Dance': 'vcer12OFU2g'
  },
  'Ariana Grande': {
    'thank u, next': 'gl1aHhXnN1k',
    '7 rings': 'QYh6mYIJG2Y',
    'positions': 'tcYodQoapMg',
    'Side To Side': 'SXiSVQZLje8',
    'no tears left to cry': 'ffxKSjUwKdU'
  }
};

// Find a YouTube ID for a specific song using our database
const getYoutubeIdForExactSong = (artist: string, title: string): string => {
  console.log('Using fallback YouTube search for:', artist, title);
  
  // Try to find an exact match for artist and song in our database
  for (const knownArtist in popularSongs) {
    // Check for artist match (case insensitive, partial match)
    if (artist.toLowerCase().includes(knownArtist.toLowerCase()) || 
        knownArtist.toLowerCase().includes(artist.toLowerCase())) {
          
      // Check if we have this song by the artist
      for (const knownSong in popularSongs[knownArtist]) {
        if (title.toLowerCase().includes(knownSong.toLowerCase()) || 
            knownSong.toLowerCase().includes(title.toLowerCase())) {
          console.log(`Found exact song match: ${knownArtist} - ${knownSong}`);
          return popularSongs[knownArtist][knownSong];
        }
      }
      
      // If we found the artist but not the exact song, return another song by that artist
      const artistSongs = Object.values(popularSongs[knownArtist]);
      if (artistSongs.length > 0) {
        // Find a song ID we haven't used recently
        const unusedSongIds = artistSongs.filter(id => !recentlyUsedFallbackIds.has(id));
        
        if (unusedSongIds.length > 0) {
          const songId = unusedSongIds[0];
          // Keep track of recently used IDs
          recentlyUsedFallbackIds.add(songId);
          if (recentlyUsedFallbackIds.size > 10) {
            // Keep the set from growing too large by removing the oldest entry
            recentlyUsedFallbackIds.delete([...recentlyUsedFallbackIds][0]);
          }
          
          console.log(`Found artist match: ${knownArtist}, using a song`);
          return songId;
        }
        
        // If all songs by this artist have been used recently, just use the first one
        const songId = artistSongs[0];
        console.log(`Found artist match: ${knownArtist}, using a song (all were recently used)`);
        return songId;
      }
    }
  }
  
  // If we can't find a match by artist or song, use a random popular song
  // (but NOT Rick Astley unless we've exhausted all options)
  
  // Flatten all songs into a single array
  const allSongs: string[] = [];
  for (const artist in popularSongs) {
    for (const song in popularSongs[artist]) {
      if (popularSongs[artist][song] !== 'dQw4w9WgXcQ') {
        allSongs.push(popularSongs[artist][song]);
      }
    }
  }
  
  // Find a song we haven't used recently
  const unusedSongs = allSongs.filter(id => !recentlyUsedFallbackIds.has(id));
  
  if (unusedSongs.length > 0) {
    const randomIndex = Math.floor(Math.random() * unusedSongs.length);
    const randomSongId = unusedSongs[randomIndex];
    
    // Keep track of recently used IDs
    recentlyUsedFallbackIds.add(randomSongId);
    if (recentlyUsedFallbackIds.size > 10) {
      recentlyUsedFallbackIds.delete([...recentlyUsedFallbackIds][0]);
    }
    
    console.log('No specific match found, using random popular song');
    return randomSongId;
  }
  
  // Last resort - in the extremely unlikely case that we've recently used all songs in our database
  console.log('All songs have been recently used, using first Billie Eilish song');
  return popularSongs['Billie Eilish']['Bad Guy']; // A safe default that's not a rickroll
};

export const searchYouTubeVideo = async (
  query: string, 
  artist: string, 
  title: string,
  duration?: number
): Promise<string | null> => {
  try {
    const params = new URLSearchParams({
      q: query,
      type: 'video',
      videoCategoryId: '10',
      maxResults: '3',
      regionCode: 'US',
      relevanceLanguage: 'en',
      ...(duration && { videoDuration: getDurationBucket(duration) })
    });

    try {
      const proxyResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=AIzaSyBvap_uw_CwmE4eWxjKoPgiVQZ3ioQjO4M`);
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        
        if (data?.items?.length > 0) {
          const scoredResults = data.items.map((item: any) => {
            const videoTitle = item.snippet.title.toLowerCase();
            return {
              ...item,
              score: [
                videoTitle.includes(artist.toLowerCase()),
                videoTitle.includes(title.toLowerCase()),
                videoTitle.includes('official'),
                videoTitle.includes('lyric') ? 0 : 1
              ].filter(Boolean).length
            };
          }).sort((a, b) => b.score - a.score);

          const bestMatch = scoredResults.find(item => 
            item.id.videoId !== 'dQw4w9WgXcQ'
          );
          
          return bestMatch?.id.videoId || data.items[0].id.videoId;
        }
      }
    } catch (proxyError) {
      console.log('Proxy API failed:', proxyError);
    }

    return getYoutubeIdForExactSong(artist, title);
    
  } catch (error) {
    console.error('YouTube search failed:', error);
    return getYoutubeIdForExactSong(artist, title);
  }
};

const extractVideoId = (url: string): string | null => {
  const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

export const verifyYouTubeMatch = async (
  youtubeId: string, 
  artist: string, 
  title: string,
  duration?: number
): Promise<boolean> => {
  if (youtubeId === 'dQw4w9WgXcQ') return false;
  
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${youtubeId}&part=snippet,contentDetails&key=AIzaSyBvap_uw_CwmE4eWxjKoPgiVQZ3ioQjO4M`);//`https://yt-api-proxy.glitch.me/videos?id=${youtubeId}&part=snippet,contentDetails`
    if (response.ok) {
      const data = await response.json();
      if (data?.items?.length > 0) {
        const video = data.items[0];
        const videoTitle = video.snippet.title.toLowerCase();
        const channelTitle = video.snippet.channelTitle.toLowerCase();
        
        // Duration verification
        let videoDuration = 0;
        if (duration && video.contentDetails?.duration) {
          const durMatch = video.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          videoDuration = durMatch ? 
            (parseInt(durMatch[1] || '0') * 3600) +
            (parseInt(durMatch[2] || '0') * 60) +
            (parseInt(durMatch[3] || '0')) : 0;
        }

        // Match scoring
        const checks = {
          titleInVideo: videoTitle.includes(title.toLowerCase()),
          artistInVideo: videoTitle.includes(artist.toLowerCase()),
          artistInChannel: channelTitle.includes(artist.toLowerCase()),
          isOfficial: channelTitle.includes('vevo') || channelTitle.includes('topic'),
          durationMatch: duration ? Math.abs(videoDuration - duration) <= 5 : true
        };

        return (
          checks.titleInVideo && 
          (checks.artistInVideo || checks.artistInChannel) &&
          checks.durationMatch
        );
      }
    }
    return false;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
};

export const recordAudio = (): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/wav' });
          stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };
        
        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 5000);
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        toast({
          title: "Microphone Error",
          description: "Please allow microphone access to detect music",
          variant: "destructive"
        });
        reject(error);
      });
  });
};

export const recognizeMusic = async (audioBlob: Blob): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob);
    formData.append('api_token', "f59d9d5e6fca5598b60e1fe2591c2515");//872cb77c2ee7145396020c4b7648501a
    formData.append('return', 'apple_music,spotify');

    const response = await fetch('https://api.audd.io/', { method: 'POST', body: formData });
    const data: AuddResponse = await response.json();

    if (data.status === 'success' && data.result) {
      const song = convertAuddResultToSong(data.result);
      if (!song) return null;

      const queries = [
        `${data.result.artist} - ${data.result.title} official music video`,
        `${data.result.artist} - ${data.result.title} official audio`,
        `${data.result.artist} - ${data.result.title} vevo`
      ];

      let bestMatch = null;
      for (const query of queries) {
        const youtubeId = await searchYouTubeVideo(
          query,
          data.result.artist,
          data.result.title,
          data.result.duration
        );
        
        if (youtubeId && await verifyYouTubeMatch(
          youtubeId,
          data.result.artist,
          data.result.title,
          data.result.duration
        )) {
          bestMatch = { id: youtubeId, verified: true };
          break;
        }
      }

      return {
        ...song,
        youtubeId: bestMatch?.id || getYoutubeIdForExactSong(data.result.artist, data.result.title),
        isVerified: bestMatch?.verified || false
      };
    }
    
    throw new Error('No song detected');
  } catch (error) {
    console.error('Recognition error:', error);
    throw error;
  }
};