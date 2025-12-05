import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useSensoryFeedback, SensoryFeedbackType } from '../../hooks/useSensoryFeedback';

interface LuxuryButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    feedbackType?: SensoryFeedbackType;
    children: React.ReactNode;
}

export const LuxuryButton = ({
    variant = 'primary',
    feedbackType = 'actuate',
    children,
    className = '',
    onClick,
    disabled,
    ...props
}: LuxuryButtonProps) => {
    const { trigger } = useSensoryFeedback();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) {
            trigger('failure');
            return;
        }

        trigger(feedbackType);
        onClick?.(e);
    };

    // Styles based on variant
    const baseStyles = "relative overflow-hidden rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-gradient-to-r from-[var(--r-gold-400)] to-[var(--r-gold-600)] text-black shadow-lg shadow-[var(--r-gold-500)]/20 hover:shadow-[var(--r-gold-500)]/40 border border-[var(--r-gold-300)]",
        secondary: "bg-[var(--r-bg-elevated)] text-[var(--r-gold-100)] border border-[var(--r-gold-700)]/30 hover:bg-[var(--r-bg-card)] hover:border-[var(--r-gold-500)]/50",
        danger: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50",
        ghost: "bg-transparent text-[var(--r-text-muted)] hover:text-[var(--r-gold-100)] hover:bg-[var(--r-gold-500)]/5"
    };

    return (
        <motion.button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            onClick={handleClick}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            {...props}
        >
            {/* Shine Effect */}
            {variant === 'primary' && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}

            {children}
        </motion.button>
    );
};
