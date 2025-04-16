// src/utils/audioRecognizer.ts

export class AudioRecognizer {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private isRecording = false;
  
    async init() {
      try {
        this.audioContext = new AudioContext();
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.chunks.push(e.data);
          }
        };
        return true;
      } catch (error) {
        console.error('Error initializing audio:', error);
        return false;
      }
    }
  
    async startRecording() {
      if (!this.mediaRecorder || this.isRecording) return;
      this.chunks = [];
      this.mediaRecorder.start();
      this.isRecording = true;
    }
  
    async stopRecording(): Promise<Blob | null> {
      return new Promise((resolve) => {
        if (!this.mediaRecorder || !this.isRecording) {
          resolve(null);
          return;
        }
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.chunks, { type: 'audio/wav' });
          this.chunks = [];
          this.isRecording = false;
          resolve(blob);
        };
        this.mediaRecorder.stop();
      });
    }
  
    async recognizeSong(audioBlob: Blob): Promise<{
      title: string;
      artist: string;
      album: string;
      releaseDate: string;
      albumArt: string;
    } | null> {
      try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');
        formData.append('api_token', 'a2b75fe310ce26d0a0a38b3283ef63e5'); // Replace with your Audd.io API token
        const response = await fetch('https://api.audd.io/', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.status === 'success' && data.result) {
          const { title, artist, album, release_date, song_link } = data.result;
          
          // Get a random image from Unsplash as a fallback if no album art
          const fallbackImage = `https://source.unsplash.com/random/300x300/?music,album,${encodeURIComponent(artist)}`;
          
          return {
            title,
            artist,
            album,
            releaseDate: release_date,
            albumArt: data.result.spotify?.album?.images?.[0]?.url || fallbackImage,
          };
        }
        return null;
      } catch (error) {
        console.error('Error recognizing song:', error);
        return null;
      }
    }
  
    cleanup() {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }
      if (this.audioContext) {
        this.audioContext.close();
      }
      this.mediaRecorder = null;
      this.mediaStream = null;
      this.audioContext = null;
    }
  }