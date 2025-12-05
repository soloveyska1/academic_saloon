import { useEffect, useRef } from 'react';

interface VaultLockProps {
  state: 'idle' | 'spinning' | 'success' | 'failed';
  userPhotoUrl?: string;
}

export const VaultLock = ({ state, userPhotoUrl }: VaultLockProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax Effect (Gyroscope/Mouse)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / 25; // Subtle movement
      const y = (e.clientY - innerHeight / 2) / 25;
      containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!containerRef.current) return;
      const x = (e.gamma || 0) / 3;
      const y = (e.beta || 0) / 3;
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
    <div className="vault-container w-72 h-72 relative flex items-center justify-center">
      <div ref={containerRef} className="vault-lock w-full h-full relative">

        {/* Outer Gear Ring (Brushed Gold) */}
        <div className={`absolute inset-0 rounded-full border-[12px] border-[var(--r-gold-700)] shadow-2xl ${state === 'spinning' ? 'animate-[spin_2s_linear_infinite]' : 'idle-rotate'}`}
          style={{ background: 'conic-gradient(from 0deg, transparent 0%, var(--r-glass-shine) 50%, transparent 100%)' }}>
          {/* Gear Teeth Simulation */}
          <div className="absolute inset-[-4px] border-4 border-dashed border-[var(--r-gold-500)] rounded-full opacity-50"></div>
        </div>

        {/* Middle Ring (Polished Brass) */}
        <div className={`absolute inset-6 rounded-full border-[2px] border-[var(--r-gold-300)] ${state === 'spinning' ? 'animate-[spin_3s_linear_infinite_reverse]' : ''} shadow-inner`}></div>

        {/* Inner Mechanism (Obsidian/Glass) */}
        <div className={`absolute inset-10 rounded-full bg-[var(--r-bg-deep)] border-4 border-[var(--r-gold-500)] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden`}>

          {/* Refraction Layer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--r-glass-shine)] to-transparent opacity-30 pointer-events-none"></div>

          {/* Center Hub / User Photo */}
          <div className="w-32 h-32 rounded-full border-2 border-[var(--r-gold-100)] overflow-hidden relative shadow-2xl z-10">
            {userPhotoUrl ? (
              <img src={userPhotoUrl} alt="User" className="w-full h-full object-cover opacity-90 mix-blend-luminosity" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black">
                {/* Jewel Lock Icon */}
                <div className="relative">
                  <div className="absolute inset-0 blur-md bg-[var(--r-gold-300)] opacity-50"></div>
                  <span className="relative text-4xl filter drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]">💎</span>
                </div>
              </div>
            )}

            {/* Scanning Line (Subtle) */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--r-gold-100)]/20 to-transparent h-1/2 w-full animate-[scan_3s_linear_infinite] opacity-30"></div>
          </div>

        </div>

        {/* Status Indicators (Engraved Plaque) */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 glass-panel px-6 py-2 rounded-full text-[10px] font-serif tracking-[0.2em] text-[var(--r-gold-100)] whitespace-nowrap shadow-lg">
          <span className={state === 'success' ? 'text-[var(--r-hacker)]' : state === 'failed' ? 'text-[var(--r-danger)]' : ''}>
            {state === 'idle' && 'LOCKED'}
            {state === 'spinning' && 'DECRYPTING...'}
            {state === 'success' && 'ACCESS GRANTED'}
            {state === 'failed' && 'ACCESS DENIED'}
          </span>
        </div>

      </div>
    </div>
  );
};
