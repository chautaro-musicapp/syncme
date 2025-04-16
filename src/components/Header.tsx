
import React from 'react';
import { Music } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  className?: string;
  onBackClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title = "SyncMe", 
  showBackButton = false,
  className,
  onBackClick
}) => {
  // Use try-catch to handle the case when useNavigate is used outside Router context
  let navigate: ReturnType<typeof useNavigate> | null = null;
  let location = { pathname: '/' };
  
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch (error) {
    console.log('Navigation hooks not available, using fallback');
  }

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else if (navigate) {
      navigate(-1);
    }
  };

  return (
    <header className={cn(
      "flex items-center justify-between p-4 text-white shadow-md animate-fade-in backdrop-blur-md bg-syncme-dark/40 border-b border-syncme-light-purple/10",
      className
    )}>
      <div className="flex items-center">
        {showBackButton && (
          <button 
            onClick={handleBackClick}
            className="mr-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex items-center">
          <div className="bg-syncme-light-purple/20 p-1.5 rounded-full mr-2">
            <Music className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-blue-200 text-transparent bg-clip-text">{title}</h1>
        </div>
      </div>
      <div className="flex items-center">
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
