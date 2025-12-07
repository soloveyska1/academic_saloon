import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export const PROGRESS_STEPS = [
    { num: 1, label: 'Оценка' },
    { num: 2, label: 'Оплата' },
    { num: 3, label: 'Работа' },
    { num: 4, label: 'Проверка' },
    { num: 5, label: 'Готово' },
]

interface LiquidProgressProps {
    activeStep: number
}

export function LiquidProgress({ activeStep }: LiquidProgressProps) {
    const benefit = ((activeStep - 1) / (PROGRESS_STEPS.length - 1)) * 100

    return (
        <div style={{ padding: '0 12px', marginBottom: 48 }}>
            {/* Liquid Bar Container */}
            <div style={{
                position: 'relative',
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 1,
            }}>
                {/* Background Track */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 10,
                    right: 18, // Adjust for center of circles
                    height: 4,
                    transform: 'translateY(-50%)',
                    zIndex: 0,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                }}>
                    {/* Liquid Fill */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${benefit}%` }}
                        transition={{ duration: 1.5, ease: "anticipate" }}
                        style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #d4af37, #fef08a, #d4af37)',
                            backgroundSize: '200% 100%',
                            boxShadow: '0 0 20px rgba(212,175,55,0.4)',
                            position: 'relative',
                            borderRadius: 10,
                        }}
                    >
                        {/* Shimmer Effect on Bar */}
                        <motion.div
                            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                                opacity: 0.5,
                            }}
                        />
                    </motion.div>
                </div>

                {/* Steps */}
                {PROGRESS_STEPS.map((step) => {
                    const isActive = step.num <= activeStep
                    const isCurrent = step.num === activeStep

                    return (
                        <div key={step.num} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative',
                            zIndex: 2,
                            width: 32, // Fixed width for alignment
                        }}>
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.3 : 1,
                                    borderColor: isActive ? '#d4af37' : 'rgba(255,255,255,0.1)',
                                    background: isActive ? '#1a1a1a' : '#0a0a0a',
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    border: '2px solid',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isActive ? '0 0 20px rgba(212,175,55,0.25)' : 'none',
                                    position: 'relative',
                                }}
                            >
                                {isActive && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            width: isCurrent ? 8 : 12,
                                            height: isCurrent ? 8 : 12,
                                            borderRadius: isCurrent ? '50%' : 2,
                                            background: '#d4af37',
                                            boxShadow: '0 0 10px #d4af37',
                                        }}
                                    >
                                        {isCurrent && (
                                            <motion.div
                                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                style={{
                                                    position: 'absolute',
                                                    inset: -4,
                                                    borderRadius: '50%',
                                                    border: '1px solid #d4af37'
                                                }}
                                            />
                                        )}
                                        {!isCurrent && <Sparkles size={12} color="#000" style={{ transform: 'scale(0.8)' }} />}
                                    </motion.div>
                                )}
                            </motion.div>

                            <span style={{
                                fontSize: 10,
                                fontWeight: isActive ? 700 : 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: isActive ? '#d4af37' : 'rgba(255,255,255,0.4)',
                                position: 'absolute',
                                top: 44,
                                whiteSpace: 'nowrap',
                                textShadow: isActive ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                            }}>
                                {step.label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
