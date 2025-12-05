import { motion, AnimatePresence } from 'framer-motion';
import { RouletteResult } from '../types';

interface PrizeModalProps {
    isOpen: boolean;
    result: RouletteResult | null;
    onClose: () => void;
}

export const PrizeModal = ({ isOpen, result, onClose }: PrizeModalProps) => {
    if (!result) return null;

    const isWin = result.type !== 'nothing';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.5, y: 50 }}
                        className="relative w-full max-w-sm bg-[var(--bg-card-solid)] border border-[var(--gold-400)] rounded-2xl p-8 text-center overflow-hidden shadow-[var(--shadow-vault)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                        {isWin && (
                            <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold-400)]/20 to-transparent animate-pulse"></div>
                        )}

                        {/* Icon / Image */}
                        <div className="mb-6 relative">
                            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl border-4 ${isWin ? 'border-[var(--gold-400)] bg-[var(--gold-400)]/10' : 'border-[var(--danger)] bg-[var(--danger)]/10'}`}>
                                {isWin ? '🏆' : '💀'}
                            </div>
                            {isWin && (
                                <div className="absolute inset-0 rounded-full shadow-[0_0_30px_var(--gold-400)] animate-pulse"></div>
                            )}
                        </div>

                        {/* Text */}
                        <h2 className={`text-2xl font-black mb-2 uppercase tracking-widest ${isWin ? 'text-[var(--gold-400)]' : 'text-[var(--danger)]'}`}>
                            {isWin ? 'CONGRATULATIONS' : 'SYSTEM FAILURE'}
                        </h2>

                        <p className="text-[var(--text-secondary)] font-mono text-sm mb-8">
                            {isWin ? `YOU RECEIVED: ${result.prize}` : 'ACCESS DENIED. TRY AGAIN.'}
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-lg font-bold uppercase tracking-widest bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-primary)]"
                        >
                            {isWin ? 'CLAIM REWARD' : 'RETRY'}
                        </button>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
