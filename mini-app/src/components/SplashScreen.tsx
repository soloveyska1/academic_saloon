import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface SplashScreenProps {
    onComplete: () => void
    ready?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
//  ULTRA-LUXURY SPLASH SCREEN — Premium Brand Experience
// ═══════════════════════════════════════════════════════════════════════════

export const SplashScreen = ({ onComplete, ready = false }: SplashScreenProps) => {
    const [phase, setPhase] = useState<'logo' | 'reveal' | 'exit'>('logo')
    const [hasSeen, setHasSeen] = useState(false)

    useEffect(() => {
        const seen = sessionStorage.getItem('as_intro_seen') === 'true'
        if (seen) {
            setHasSeen(true)
            const timer = setTimeout(onComplete, 400)
            return () => clearTimeout(timer)
        }

        sessionStorage.setItem('as_intro_seen', 'true')

        const revealTimer = setTimeout(() => setPhase('reveal'), 600)
        const exitTimer = setTimeout(() => setPhase('exit'), 2800)
        const completeTimer = setTimeout(onComplete, 3500)

        return () => {
            clearTimeout(revealTimer)
            clearTimeout(exitTimer)
            clearTimeout(completeTimer)
        }
    }, [onComplete])

    useEffect(() => {
        if (!hasSeen && ready && phase !== 'exit') {
            setPhase('exit')
            const timer = setTimeout(onComplete, 700)
            return () => clearTimeout(timer)
        }
    }, [hasSeen, onComplete, phase, ready])

    if (hasSeen) {
        return (
            <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                style={{ background: '#030303' }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
            >
                <QuickMonogram />
            </motion.div>
        )
    }

    return (
        <AnimatePresence>
            <motion.div
                key="luxury-splash"
                className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
                style={{ background: '#030303' }}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Deep space background */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
                            radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.08) 0%, transparent 50%),
                            radial-gradient(ellipse at 50% 70%, rgba(179,135,40,0.05) 0%, transparent 40%),
                            radial-gradient(circle at 50% 50%, #0a0a0a 0%, #030303 100%)
                        `,
                    }}
                />

                {/* Floating gold particles */}
                <GoldParticles active={phase !== 'logo'} />

                {/* Main content container */}
                <motion.div
                    className="relative z-10 flex flex-col items-center"
                    animate={phase === 'exit' ? { scale: 1.5, opacity: 0 } : { scale: 1, opacity: 1 }}
                    transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
                >
                    {/* Luxury emblem */}
                    <LuxuryEmblem phase={phase} />

                    {/* Brand name */}
                    <motion.div
                        className="mt-8 flex flex-col items-center gap-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: phase !== 'logo' ? 1 : 0, y: phase !== 'logo' ? 0 : 20 }}
                        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
                    >
                        <ShimmeringBrandName active={phase === 'reveal'} />

                        {/* Elegant divider */}
                        <motion.div
                            className="relative h-[1px] w-40 overflow-hidden"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{
                                width: phase !== 'logo' ? 160 : 0,
                                opacity: phase !== 'logo' ? 1 : 0
                            }}
                            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.4 }}
                        >
                            <motion.div
                                className="absolute inset-0"
                                style={{
                                    background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                                }}
                                animate={{
                                    boxShadow: [
                                        '0 0 10px rgba(212,175,55,0.3)',
                                        '0 0 25px rgba(212,175,55,0.6)',
                                        '0 0 10px rgba(212,175,55,0.3)',
                                    ]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </motion.div>

                        {/* Tagline */}
                        <motion.span
                            className="mt-4 text-xs tracking-[0.4em] uppercase"
                            style={{
                                color: 'rgba(212,175,55,0.6)',
                                fontFamily: '"Inter", sans-serif',
                                fontWeight: 300,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: phase !== 'logo' ? 1 : 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            Premium Academic Service
                        </motion.span>
                    </motion.div>
                </motion.div>

                {/* Bottom ambient light */}
                <motion.div
                    className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to top, rgba(212,175,55,0.03) 0%, transparent 100%)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase !== 'logo' ? 1 : 0 }}
                    transition={{ duration: 1 }}
                />
            </motion.div>
        </AnimatePresence>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LUXURY EMBLEM — Animated Premium Badge
// ═══════════════════════════════════════════════════════════════════════════

const LuxuryEmblem = ({ phase }: { phase: string }) => {
    return (
        <div className="relative flex items-center justify-center">
            {/* Outer glow ring */}
            <motion.div
                className="absolute"
                style={{
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Rotating outer ring */}
            <motion.div
                className="absolute"
                style={{ width: 140, height: 140 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
                <svg viewBox="0 0 140 140" className="w-full h-full">
                    <defs>
                        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#B38728" />
                            <stop offset="50%" stopColor="#FCF6BA" />
                            <stop offset="100%" stopColor="#D4AF37" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx="70"
                        cy="70"
                        r="65"
                        fill="none"
                        stroke="url(#ringGradient)"
                        strokeWidth="0.5"
                        strokeDasharray="4 8"
                        opacity="0.6"
                    />
                </svg>
            </motion.div>

            {/* Inner decorative ring */}
            <motion.div
                className="absolute"
                style={{ width: 120, height: 120 }}
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
                <svg viewBox="0 0 120 120" className="w-full h-full">
                    <circle
                        cx="60"
                        cy="60"
                        r="55"
                        fill="none"
                        stroke="rgba(212,175,55,0.3)"
                        strokeWidth="0.5"
                    />
                    {/* Decorative dots */}
                    {[...Array(12)].map((_, i) => {
                        const angle = (i * 30 * Math.PI) / 180
                        const x = 60 + 55 * Math.cos(angle)
                        const y = 60 + 55 * Math.sin(angle)
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="1.5"
                                fill="#D4AF37"
                                opacity={i % 3 === 0 ? 0.8 : 0.4}
                            />
                        )
                    })}
                </svg>
            </motion.div>

            {/* Center emblem */}
            <motion.div
                className="relative z-10 flex items-center justify-center"
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: 'linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 50%, #0a0a0a 100%)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    boxShadow: `
                        0 0 40px rgba(212,175,55,0.15),
                        inset 0 0 30px rgba(0,0,0,0.5),
                        inset 0 1px 0 rgba(255,255,255,0.05)
                    `,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
                {/* Crown icon - Real Crown SVG */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                >
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                        <defs>
                            <linearGradient id="crownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FCF6BA" />
                                <stop offset="50%" stopColor="#D4AF37" />
                                <stop offset="100%" stopColor="#B38728" />
                            </linearGradient>
                            <filter id="crownGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="1" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        {/* Crown shape */}
                        <path
                            d="M2 17L4 8L7.5 11L12 4L16.5 11L20 8L22 17H2Z"
                            fill="url(#crownGradient)"
                            filter="url(#crownGlow)"
                        />
                        {/* Crown base */}
                        <path
                            d="M3 18H21V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V18Z"
                            fill="url(#crownGradient)"
                        />
                        {/* Crown jewels */}
                        <circle cx="7" cy="14" r="1" fill="#030303" opacity="0.3" />
                        <circle cx="12" cy="13" r="1.2" fill="#030303" opacity="0.3" />
                        <circle cx="17" cy="14" r="1" fill="#030303" opacity="0.3" />
                    </svg>
                </motion.div>

                {/* Shine effect */}
                <motion.div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, transparent 100%)',
                    }}
                />

                {/* Shimmer sweep */}
                <motion.div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase !== 'logo' ? 1 : 0 }}
                >
                    <motion.div
                        className="absolute top-0 left-0 w-full h-full"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                            transform: 'skewX(-20deg)',
                        }}
                        animate={{ x: ['-150%', '250%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                    />
                </motion.div>
            </motion.div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHIMMERING BRAND NAME
// ═══════════════════════════════════════════════════════════════════════════

const ShimmeringBrandName = ({ active }: { active: boolean }) => {
    return (
        <div className="relative">
            {/* Base text (shadow) */}
            <h1
                className="text-2xl font-bold tracking-[0.35em]"
                style={{
                    fontFamily: '"Cinzel", "Playfair Display", serif',
                    color: '#2a2010',
                    textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                }}
            >
                ACADEMIC SALOON
            </h1>

            {/* Gradient text with shimmer */}
            <motion.h1
                className="absolute inset-0 text-2xl font-bold tracking-[0.35em]"
                style={{
                    fontFamily: '"Cinzel", "Playfair Display", serif',
                    background: 'linear-gradient(90deg, #B38728 0%, #B38728 30%, #FCF6BA 50%, #B38728 70%, #B38728 100%)',
                    backgroundSize: '250% 100%',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                }}
                initial={{ backgroundPosition: '-150% 0' }}
                animate={active ? { backgroundPosition: ['150% 0', '-150% 0'] } : { backgroundPosition: '-150% 0' }}
                transition={{ duration: 3, ease: 'easeInOut', repeat: active ? Infinity : 0, repeatDelay: 1 }}
            >
                ACADEMIC SALOON
            </motion.h1>

            {/* Glow effect */}
            <motion.div
                className="pointer-events-none absolute inset-0 blur-lg"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
                }}
                animate={active ? { opacity: [0.3, 0.6, 0.3] } : { opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GOLD PARTICLES
// ═══════════════════════════════════════════════════════════════════════════

const GoldParticles = ({ active }: { active: boolean }) => {
    const particles = [...Array(20)].map((_, i) => ({
        id: i,
        left: `${5 + (i * 5) % 90}%`,
        top: `${10 + (i * 7) % 80}%`,
        size: 1 + (i % 3),
        delay: i * 0.2,
        duration: 4 + (i % 3) * 2,
    }))

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        background: '#D4AF37',
                        boxShadow: `0 0 ${p.size * 3}px rgba(212,175,55,0.6)`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={active ? {
                        opacity: [0, 0.8, 0.4, 0.8, 0],
                        scale: [0.5, 1, 0.8, 1, 0.5],
                        y: [0, -20, -10, -30, -50],
                    } : { opacity: 0 }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK MONOGRAM (for returning users)
// ═══════════════════════════════════════════════════════════════════════════

const QuickMonogram = () => (
    <motion.div
        className="flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
    >
        <div
            className="relative flex items-center justify-center"
            style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #0d0d0d, #1a1a1a)',
                border: '1px solid rgba(212,175,55,0.3)',
                boxShadow: '0 0 30px rgba(212,175,55,0.1)',
            }}
        >
            <span
                className="text-3xl font-bold"
                style={{
                    fontFamily: '"Cinzel", serif',
                    background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                }}
            >
                AS
            </span>
        </div>
    </motion.div>
)

export default SplashScreen
