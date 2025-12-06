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
        <div style={{ padding: '0 8px', marginBottom: 40 }}>
            {/* Liquid Bar Container */}
            <div style={{
                position: 'relative',
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 1,
            }}>
                {/* Background Track -> vip-progress-bar style */}
                <div className="vip-progress-bar" style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: 4,
                    transform: 'translateY(-50%)',
                    zIndex: 0,
                    background: 'var(--border-default)',
                }}>
                    {/* Liquid Fill */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${benefit}%` }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        style={{
                            height: '100%',
                            background: 'var(--gold-metallic)',
                            boxShadow: '0 0 15px var(--pc-glow-gold)',
                            position: 'relative',
                            borderRadius: 10,
                        }}
                    />
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
                            gap: 12,
                        }}>
                            <motion.div
                                initial={false}
                                animate={{
                                    scale: isCurrent ? 1.2 : 1,
                                    backgroundColor: isActive ? 'var(--pc-black)' : 'var(--bg-main)',
                                    borderColor: isActive ? 'var(--gold-400)' : 'var(--border-strong)',
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    border: '2px solid',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--bg-main)',
                                    boxShadow: isActive ? '0 0 15px var(--pc-glow-gold)' : 'none',
                                }}
                            >
                                {isActive ? (
                                    isCurrent ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Sparkles size={14} color="var(--gold-400)" />
                                        </motion.div>
                                    ) : (
                                        <div style={{ width: 8, height: 8, background: 'var(--gold-400)', borderRadius: '50%' }} />
                                    )
                                ) : (
                                    <div style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: '50%' }} />
                                )}
                            </motion.div>

                            <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: isActive ? 'var(--gold-400)' : 'var(--text-muted)',
                                position: 'absolute',
                                top: 40,
                                whiteSpace: 'nowrap',
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
