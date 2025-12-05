import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export const PROGRESS_STEPS = [
    { num: 1, label: 'Оценка' },
    { num: 2, label: 'Оплата' },
    { num: 3, label: 'Работа' },
    { num: 4, label: 'Проверка' },
    { num: 5, label: 'Готово' },
]

interface OrderProgressProps {
    activeStep: number
}

export function OrderProgress({ activeStep }: OrderProgressProps) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
            padding: '0 8px',
            position: 'relative',
        }}>
            {/* Connector Line */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: 24,
                right: 24,
                height: 2,
                background: 'var(--border-default)',
                zIndex: 0,
            }}>
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #d4af37, #f59e0b)',
                        transformOrigin: 'left',
                        width: `${((activeStep - 1) / (PROGRESS_STEPS.length - 1)) * 100}%`,
                    }}
                />
            </div>

            {PROGRESS_STEPS.map((step) => {
                const isActive = step.num <= activeStep
                const isCompleted = step.num < activeStep
                const isCurrent = step.num === activeStep

                return (
                    <div key={step.num} style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <motion.div
                            initial={false}
                            animate={{
                                scale: isCurrent ? 1.1 : 1,
                                backgroundColor: isActive ? '#18181b' : 'var(--bg-card-solid)',
                                borderColor: isActive ? '#f59e0b' : 'var(--border-default)',
                            }}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: '2px solid',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--bg-card-solid)',
                                boxShadow: isCurrent ? '0 0 15px rgba(245,158,11,0.3)' : 'none',
                            }}
                        >
                            {isCompleted ? (
                                <Check size={20} color="#f59e0b" strokeWidth={3} />
                            ) : (
                                <span style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: isActive ? '#f59e0b' : 'var(--text-muted)',
                                }}>
                                    {step.num}
                                </span>
                            )}
                        </motion.div>
                        <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                            opacity: isActive ? 1 : 0.6,
                        }}>
                            {step.label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
