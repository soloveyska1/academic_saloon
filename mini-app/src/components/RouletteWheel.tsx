import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { RouletteResult } from '../types';

interface RouletteWheelProps {
    isSpinning: boolean;
    result: RouletteResult | null;
}

export const RouletteWheel = ({ isSpinning, result }: RouletteWheelProps) => {
    const controls = useAnimation();

    useEffect(() => {
        if (isSpinning) {
            controls.start({
                rotate: 360 * 5, // Spin 5 times
                transition: { duration: 4, ease: "easeInOut" }
            });
        } else if (result) {
            // Stop at specific angle based on result (mock logic for visual demo)
            // In a real wheel, we'd calculate the exact angle for the prize
            controls.start({
                rotate: 360 * 6, // Ensure it lands "forward"
                transition: { duration: 0.5, ease: "easeOut" }
            });
        }
    }, [isSpinning, result, controls]);

    return (
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Outer Glow - Theme Aware */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--gold-400)] to-[var(--gold-700)] opacity-20 blur-xl animate-pulse"></div>

            {/* Main Wheel Container */}
            <motion.div
                className="relative w-full h-full rounded-full border-4 border-[var(--gold-600)] shadow-[var(--shadow-vault)] bg-[var(--bg-card-solid)] overflow-hidden"
                animate={controls}
                initial={{ rotate: 0 }}
            >
                {/* Inner Decorative Rings */}
                <div className="absolute inset-2 rounded-full border border-[var(--gold-400)] opacity-30"></div>
                <div className="absolute inset-8 rounded-full border border-dashed border-[var(--gold-400)] opacity-20"></div>

                {/* Sectors (Visual Representation) */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-[var(--text-muted)] font-mono text-xs tracking-widest opacity-50">
                        ACADEMIC<br />JACKPOT
                    </div>
                </div>

                {/* Active Indicator */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-4 h-8 bg-[var(--danger)] clip-path-triangle z-10 shadow-lg"></div>
            </motion.div>

            {/* Center Hub */}
            <div className="absolute w-16 h-16 rounded-full bg-[var(--bg-void)] border-2 border-[var(--gold-400)] flex items-center justify-center shadow-[var(--glow-gold)] z-20">
                <div className="w-12 h-12 rounded-full bg-[var(--gold-metallic)] opacity-80 animate-pulse"></div>
            </div>
        </div>
    );
};
