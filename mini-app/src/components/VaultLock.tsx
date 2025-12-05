import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { useSound } from '../hooks/useSound';
import '../styles/Roulette.css';

interface VaultLockProps {
  state: 'idle' | 'spinning' | 'success' | 'failed';
  userPhotoUrl?: string;
  onUnlock?: () => void;
}

export const VaultLock = ({ state, userPhotoUrl }: VaultLockProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();

  // Mouse/Gyro motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for rotation
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), { stiffness: 150, damping: 20 });

  // Internal rotation for the lock mechanism
  const [lockRotation, setLockRotation] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth) - 0.5;
      const y = (e.clientY / innerHeight) - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      // Normalize roughly to [-0.5, 0.5] range
      const x = Math.min(Math.max(e.gamma / 90, -0.5), 0.5);
      const y = Math.min(Math.max(e.beta / 90, -0.5), 0.5);
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [mouseX, mouseY]);

  // Handle state changes for animations and sound
  useEffect(() => {
    if (state === 'spinning') {
      playSound('turbine');
      // Simulate rapid spinning
      const interval = setInterval(() => {
        setLockRotation(prev => prev + 45);
        if (Math.random() > 0.7) playSound('click');
      }, 50);
      return () => clearInterval(interval);
    } else if (state === 'success') {
      playSound('success');
      playSound('heavy_latch');
      setLockRotation(0);
    } else if (state === 'failed') {
      playSound('glitch');
    }
  }, [state, playSound]);

  return (
    <div className="vault-container relative w-72 h-72 md:w-96 md:h-96 mx-auto z-20 perspective-1000" ref={containerRef}>
      <motion.div
        className="w-full h-full relative preserve-3d"
        style={{ rotateX, rotateY }}
      >
        {/* --- OUTER RING (Static Frame) --- */}
        <div className="absolute inset-0 rounded-full border-[6px] border-[#1a1a1a] shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-[#09090b] flex items-center justify-center">
          {/* Gold Trim */}
          <div className="absolute inset-0 rounded-full border border-[#D4AF37]/30" />

          {/* Decorative Bolts */}
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute w-3 h-3 rounded-full bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${deg}deg) translate(140px) translate(-50%, -50%)` // Adjust based on size
              }}
            />
          ))}
        </div>

        {/* --- MIDDLE RING (The Lock Mechanism) --- */}
        <motion.div
          className="absolute inset-4 rounded-full border-[2px] border-[#D4AF37]/50 flex items-center justify-center bg-[#0c0c0e]"
          animate={{ rotate: state === 'spinning' ? lockRotation : 0 }}
          transition={{ type: "spring", stiffness: 50 }}
        >
          {/* Ticks */}
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-[2px] ${i % 6 === 0 ? 'h-4 bg-[#D4AF37]' : 'h-2 bg-[#D4AF37]/40'}`}
              style={{
                top: '0',
                left: '50%',
                transformOrigin: '0 136px', // Half of inset-4 (approx)
                transform: `rotate(${i * 15}deg) translateX(-50%)`
              }}
            />
          ))}

          {/* Inner Glow Ring */}
          <div className={`absolute inset-8 rounded-full border border-[#D4AF37]/20 transition-all duration-500 ${state === 'success' ? 'shadow-[0_0_50px_#D4AF37] border-[#D4AF37]' : ''}`} />
        </motion.div>

        {/* --- CENTER CORE (The Prize/User) --- */}
        <div className="absolute inset-16 rounded-full overflow-hidden border-4 border-[#1a1a1a] bg-black shadow-inner flex items-center justify-center">
          {/* Scanlines Overlay */}
          <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzQx/giphy.gif')] opacity-10 pointer-events-none mix-blend-overlay"></div>

          {/* User Photo or Mystery */}
          <div className="relative w-full h-full">
            {userPhotoUrl ? (
              <motion.img
                src={userPhotoUrl}
                alt="User"
                className="w-full h-full object-cover"
                initial={{ opacity: 0.5, scale: 1.2 }}
                animate={{
                  opacity: state === 'success' ? 1 : 0.6,
                  scale: state === 'success' ? 1 : 1.2,
                  filter: state === 'spinning' ? 'blur(2px) brightness(1.5)' : 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#050505]">
                <span className="text-4xl font-bold text-[#D4AF37]/20">?</span>
              </div>
            )}

            {/* Holographic Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/10 to-transparent mix-blend-overlay transition-opacity ${state === 'success' ? 'opacity-0' : 'opacity-100'}`} />
          </div>
        </div>

        {/* --- STATUS INDICATOR --- */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-full text-center">
          <motion.div
            className={`inline-block px-4 py-1 rounded border ${state === 'success'
              ? 'border-[#0F0] bg-[#0F0]/10 text-[#0F0]'
              : state === 'failed'
                ? 'border-red-500 bg-red-500/10 text-red-500'
                : 'border-[#D4AF37]/30 bg-black/50 text-[#D4AF37]'
              }`}
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <span className="text-xs font-mono font-bold tracking-[0.2em]">
              {state === 'spinning' ? 'DECRYPTING SEQUENCE...' :
                state === 'success' ? 'ACCESS GRANTED' :
                  state === 'failed' ? 'ACCESS DENIED' : 'SYSTEM LOCKED'}
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
