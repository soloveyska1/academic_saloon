import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuxuryLoader } from './ui/LuxuryLoader';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [stage, setStage] = useState(0); // 0: Text, 1: Line & Seal, 2: Exit
    const [shouldShow, setShouldShow] = useState(true);

    useEffect(() => {
        // Session check: If already seen, skip intro
        const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
        if (hasSeenIntro) {
            setShouldShow(false);
            onComplete();
            return;
        }

        // Mark as seen
        sessionStorage.setItem('hasSeenIntro', 'true');

        // Sequence Timing
        const sequence = async () => {
            // Stage 0: Text Shimmer (Start immediately)
            await new Promise(r => setTimeout(r, 2000)); // Let text shimmer for 2s

            // Stage 1: Line & Seal
            setStage(1);
            await new Promise(r => setTimeout(r, 2500)); // Show loader for 2.5s

            // Stage 2: Gateway Exit
            setStage(2);
            await new Promise(r => setTimeout(r, 800)); // Exit animation duration

            onComplete();
        };

        sequence();
    }, [onComplete]);

    if (!shouldShow) return null;

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505] overflow-hidden"
            initial={{ opacity: 1 }}
            animate={stage === 2 ? {
                scale: 20,
                opacity: 0,
                pointerEvents: 'none'
            } : {
                scale: 1,
                opacity: 1
            }}
            transition={{ duration: 0.8, ease: [0.6, 0.05, -0.01, 0.9] }}
        >
            {/* Vignette Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-80" />

            <div className="relative z-10 flex flex-col items-center">

                {/* Stage 0: Shimmering Text */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="font-serif text-3xl md:text-5xl font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[#46351D] via-[#FCF6BA] to-[#46351D] animate-shimmer bg-[length:200%_auto]"
                    style={{
                        textShadow: '0 0 20px rgba(252, 246, 186, 0.1)'
                    }}
                >
                    ACADEMIC SALOON
                </motion.h1>

                {/* Stage 1: The Golden Line */}
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={stage >= 1 ? { width: "120%", opacity: 1 } : { width: 0, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="h-[1px] bg-gradient-to-r from-transparent via-[#FCF6BA] to-transparent mt-6 mb-8"
                />

                {/* Stage 1: The Seal (LuxuryLoader) */}
                <AnimatePresence>
                    {stage >= 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="scale-75 origin-top">
                                <LuxuryLoader />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </motion.div>
    );
};
