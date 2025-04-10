
import React from 'react';
import { Music } from 'lucide-react';
import { recordAudio, recognizeMusic } from '@/utils/musicDetection';
import { toast } from '@/hooks/use-toast';

interface DetectButtonProps {
  onDetect: () => void;
  isDetecting: boolean;
  startListening: () => void;
}

const DetectButton: React.FC<DetectButtonProps> = ({ onDetect, isDetecting, startListening }) => {
  const handleDetectClick = async () => {
    if (isDetecting) return;
    
    try {
      // Inform the parent that we're starting detection
      onDetect();
      startListening();
      
      // Show toast notification
      toast({
        title: "Listening for music...",
        description: "Please hold your device close to the music source",
      });
      
    } catch (error) {
      console.error('Error in detect button:', error);
      toast({
        title: "Detection Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col items-center relative">
      <div className="absolute top-[-30px] left-[-30px] opacity-10 text-2xl float-slow">
        🎵
      </div>
      <div className="absolute top-[20px] right-[-50px] opacity-20 text-3xl float">
        🎸
      </div>
      <div className="absolute bottom-[-10px] left-[-40px] opacity-20 text-xl float-fast">
        🎺
      </div>
      
      <button
        onClick={handleDetectClick}
        disabled={isDetecting}
        className={`relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full btn-primary ${
          isDetecting ? 'opacity-75' : 'hover:scale-105'
        } transition-all duration-300 shadow-[0_0_25px_rgba(155,135,245,0.5)]`}
      >
        {isDetecting ? (
          <>
            <span className="absolute w-full h-full rounded-full bg-syncme-light-purple animate-pulse-ring"></span>
            <span className="absolute w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-syncme-light-purple/30"></span>
            <span className="absolute w-44 h-44 md:w-48 md:h-48 rounded-full border border-syncme-light-purple/20"></span>
            <Music className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </>
        ) : (
          <>
            <span className="absolute w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-syncme-light-purple/10"></span>
            <Music className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </>
        )}
      </button>
      <p className="mt-4 text-lg font-medium text-center text-glow">
        {isDetecting ? '🎧 Listening...' : '👂 Tap to Detect Music'}
      </p>
    </div>
  );
};

export default DetectButton;
