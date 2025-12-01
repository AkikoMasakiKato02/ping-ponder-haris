import React, { useState, useEffect } from 'react';

interface RobotAvatarProps {
  isSpeaking?: boolean;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  toggleSpeed?: number;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({ 
  isSpeaking = false, 
  state = 'idle',
  toggleSpeed = 200 
}) => {
  const [currentImage, setCurrentImage] = useState('moving');
  
  // Toggle between images when speaking
  useEffect(() => {
    console.log('RobotAvatar state changed:', state, 'isSpeaking:', isSpeaking);
    
    if (state === 'speaking') {
      console.log('Starting image toggle for speaking state');
      const interval = setInterval(() => {
        setCurrentImage(prev => {
          const newImage = prev === 'still' ? 'moving' : 'still';
          console.log('Toggling image from', prev, 'to', newImage);
          return newImage;
        });
      }, toggleSpeed);
      
      return () => clearInterval(interval);
    } else {
      console.log('Not speaking, showing moving image');
      // When not speaking, always show moving image
      setCurrentImage('moving');
    }
  }, [state, toggleSpeed, isSpeaking]);

  const getImageSrc = () => {
    if (currentImage === 'still') {
      return '/still.jpg';
    }
    return '/moving.jpg';
  };

  return (
    <div style={{
      width: '200px',
      height: '200px',
      borderRadius: '50%',
      background: state === 'speaking' ? '#10b981' : 
                  state === 'listening' ? '#3b82f6' : 
                  state === 'thinking' ? '#f59e0b' : '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      transition: `all ${toggleSpeed}ms ease-in-out`,
      animation: state === 'speaking' ? 'pulse 1s infinite' : 'none',
      boxShadow: state === 'speaking' ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
      overflow: 'hidden'
    }}>
      <img 
        src={getImageSrc()}
        alt="Robot Avatar"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '50%',
          transition: `opacity ${toggleSpeed}ms ease-in-out`
        }}
        onError={(e) => {
          // Fallback to emoji if images fail to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = '<div style="font-size: 80px; color: white;">🤖</div>';
          }
        }}
      />
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

