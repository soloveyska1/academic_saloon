import { useEffect, useRef } from 'react';

interface VaultLockProps {
  state: 'idle' | 'spinning' | 'success' | 'failed';
  userPhotoUrl?: string;
}

export const VaultLock = ({ state, userPhotoUrl }: VaultLockProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / 20;
      const y = (e.clientY - innerHeight / 2) / 20;
      containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!containerRef.current) return;
      const x = (e.gamma || 0) / 2; // Tilt L/R
      const y = (e.beta || 0) / 2;  // Tilt F/B
      containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div className="vault-container w-64 h-64 relative flex items-center justify-center">
      <div ref={containerRef} className="vault-lock w-full h-full relative">

        {/* Outer Ring */}
        <div className={`absolute inset-0 rounded-full border-4 border-[var(--roulette-gold)]/30 border-dashed ${state === 'spinning' ? 'animate-[spin_2s_linear_infinite]' : ''}`}></div>

        {/* Middle Ring */}
        <div className={`absolute inset-4 rounded-full border-2 border-[var(--roulette-gold)]/50 ${state === 'spinning' ? 'animate-[spin_3s_linear_infinite_reverse]' : ''}`}></div>

        {/* Inner Ring */}
        <div className={`absolute inset-8 rounded-full border-8 border-[var(--roulette-bg)] shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-[var(--roulette-gold)]/10 backdrop-blur-sm flex items-center justify-center ${state === 'success' ? 'border-[var(--roulette-hacker)]' : 'border-[var(--roulette-gold)]'}`}>

          {/* Center Hub / User Photo */}
          <div className="w-32 h-32 rounded-full bg-[var(--roulette-bg)] border-2 border-[var(--roulette-gold)] overflow-hidden relative shadow-inner">
            {userPhotoUrl ? (
              <img src={userPhotoUrl} alt="User" className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--roulette-gold)]/50 text-4xl">
                🔒
              </div>
            )}

            {/* Scanning Line */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--roulette-hacker)]/50 to-transparent h-1/2 w-full animate-[scan_2s_linear_infinite] opacity-50"></div>
          </div>

        </div>

        {/* Status Indicators */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-widest text-[var(--roulette-gold)] whitespace-nowrap">
          STATUS: <span className={state === 'success' ? 'text-[var(--roulette-hacker)]' : state === 'failed' ? 'text-[var(--roulette-danger)]' : ''}>
            {state === 'idle' && 'ЗАБЛОКИРОВАНО'}
            {state === 'spinning' && 'ДЕШИФРОВКА...'}
            {state === 'success' && 'ДОСТУП РАЗРЕШЕН'}
            {state === 'failed' && 'ОТКАЗАНО В ДОСТУПЕ'}
          </span>
        </div>

      </div>
    </div>
  );
};
