import { motion } from 'framer-motion';
import { useSound } from '../hooks/useSound';

interface SpinButtonProps {
    onClick: () => void;
    disabled: boolean;
    freeSpins: number;
    cost: number;
}

export const SpinButton = ({ onClick, disabled, freeSpins, cost }: SpinButtonProps) => {
    const { playSound } = useSound();

    const handleClick = () => {
        if (disabled) return;
        playSound('click');
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
        onClick();
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={disabled}
            onClick={handleClick}
            className={`
        relative w-full max-w-xs h-16 rounded-xl overflow-hidden
        flex items-center justify-center gap-3
        transition-all duration-300
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-[var(--glow-gold-strong)]'}
      `}
        >
            {/* Background - Liquid Gold */}
            <div className="absolute inset-0 bg-[var(--liquid-gold)]"></div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center leading-none text-black font-black tracking-widest uppercase">
                <span className="text-xl">
                    {freeSpins > 0 ? 'FREE SPIN' : 'SPIN'}
                </span>
                <span className="text-[10px] opacity-80 font-mono">
                    {freeSpins > 0 ? `${freeSpins} LEFT` : `${cost} BONUSES`}
                </span>
            </div>

            {/* Border Overlay */}
            <div className="absolute inset-0 rounded-xl border-2 border-white/30 pointer-events-none"></div>
        </motion.button>
    );
};
