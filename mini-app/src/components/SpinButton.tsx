import { motion } from 'framer-motion';
import { useSound } from '../hooks/useSound';

interface SpinButtonProps {
    onMouseDown: () => void;
    onMouseUp: () => void;
    disabled: boolean;
    progress: number;
}

export const SpinButton = ({ onMouseDown, onMouseUp, disabled, progress }: SpinButtonProps) => {
    const { playSound } = useSound();

    const handlePress = () => {
        if (disabled) return;
        playSound('click');
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
        onMouseDown();
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            disabled={disabled}
            onMouseDown={handlePress}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={handlePress}
            onTouchEnd={onMouseUp}
            className={`
        relative w-full h-14 rounded-full overflow-hidden
        flex items-center justify-center gap-3
        transition-all duration-300
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-[0_0_20px_rgba(212,175,55,0.4)]'}
      `}
            style={{
                background: 'linear-gradient(145deg, var(--r-gold-700), var(--r-gold-300))',
                boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.2), inset -2px -2px 5px rgba(0,0,0,0.3)'
            }}
        >
            {/* Progress Overlay (Liquid Fill) */}
            <motion.div
                className="absolute inset-0 bg-[var(--r-gold-100)] mix-blend-overlay origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center leading-none text-[var(--r-bg-base)] font-serif font-black tracking-[0.2em] uppercase">
                <span className="text-lg drop-shadow-md">
                    {progress > 0 ? `ВЗЛОМ ${Math.floor(progress)}%` : 'ВЗЛОМАТЬ'}
                </span>
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
        </motion.button>
    );
};
