import { useEffect, useRef, useState } from 'react';
import '../styles/Roulette.css';

interface VaultLockProps {
  state: 'idle' | 'spinning' | 'success';
  userPhotoUrl?: string;
}

export const VaultLock = ({ state, userPhotoUrl }: VaultLockProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / 20; // dividing effectively limits the rotation angle
      const y = (e.clientY - innerHeight / 2) / 20;
      setRotation({ x: -y, y: x });
    };

    // Simple gyro fallback support
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!e.beta || !e.gamma) return;
      // beta is front/back tilt [-180, 180], gamma is left/right [-90, 90]
      // Limit movement
      const x = Math.min(Math.max(e.beta / 2, -15), 15);
      const y = Math.min(Math.max(e.gamma / 2, -15), 15);
      setRotation({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div className="vault-container relative w-64 h-64 md:w-80 md:h-80 mx-auto mt-12 z-10" ref={containerRef}>
      <div
        className={`vault-lock w-full h-full relative ${state === 'spinning' ? 'spinning' : ''} ${state === 'success' ? 'shaking' : ''}`}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
        }}
      >
        {/* Outer Ring with Notches */}
        <div className="absolute inset-0 rounded-full border-4 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          {/* Decoractive Dashes */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-4 bg-[#AA872C]"
              style={{
                top: '0',
                left: '50%',
                transformOrigin: '0 160px', /* Half of w-80 (320px) */
                transform: `rotate(${i * 30}deg) translateX(-50%)`
              }}
            />
          ))}

          {/* Middle Metallic Ring */}
          <div className={`absolute w-[80%] h-[80%] rounded-full border-2 border-[#AA872C] flex items-center justify-center transition-all duration-1000 ${state === 'success' ? 'border-[#0F0] shadow-[0_0_30px_#0F0]' : ''}`}>
            {/* Inner Glass & User Photo */}
            <div className="absolute w-[70%] h-[70%] rounded-full overflow-hidden border border-[#D4AF37]/50 shadow-inner bg-[#050505]">
              {userPhotoUrl ? (
                <img src={userPhotoUrl} alt="Target" className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#D4AF37]/20 text-4xl font-bold">?</div>
              )}
              {/* Targeting Reticle Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[80%] h-[1px] bg-[#D4AF37]/50 absolute"></div>
                <div className="h-[80%] w-[1px] bg-[#D4AF37]/50 absolute"></div>
                <div className="w-[60%] h-[60%] border border-[#D4AF37]/30 rounded-full absolute"></div>
              </div>
              {/* Glitch Overlay if Spinning */}
              {state === 'spinning' && (
                <div className="absolute inset-0 bg-red-500/10 animate-pulse mix-blend-overlay"></div>
              )}
            </div>
          </div>
        </div>

        {/* Lock Status Text */}
        <div className="absolute -bottom-12 left-0 right-0 text-center">
          <span className={`text-xs font-bold tracking-[0.3em] ${state === 'success' ? 'text-[#0F0] animate-pulse' : 'text-[#D4AF37]'}`}>
            {state === 'spinning' ? 'DECRYPTING...' : state === 'success' ? 'ACCESS GRANTED' : 'LOCKED'}
          </span>
        </div>
      </div>
    </div>
  );
};
