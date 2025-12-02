import { useState } from 'react'
import { UserData, RouletteResult } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { spinRoulette } from '../api/userApi'
import styles from './RoulettePage.module.css'

interface Props {
  user: UserData | null
}

export function RoulettePage({ user }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<RouletteResult | null>(null)
  const [rotation, setRotation] = useState(0)
  const [canSpin, setCanSpin] = useState(user?.daily_luck_available ?? false)

  const prizes = [
    { label: '5%', color: '#d4a853' },
    { label: '50₽', color: '#5cb85c' },
    { label: '🤠', color: '#b87333' },
    { label: '100₽', color: '#5bc0de' },
    { label: '10%', color: '#f0ad4e' },
    { label: '💫', color: '#9b59b6' },
    { label: '200₽', color: '#e74c3c' },
    { label: '🍀', color: '#2ecc71' },
  ]

  const handleSpin = async () => {
    if (!canSpin || spinning) return

    haptic('heavy')
    setSpinning(true)
    setResult(null)

    // Random rotation (5-8 full spins + random segment)
    const spins = 5 + Math.random() * 3
    const newRotation = rotation + (spins * 360) + Math.random() * 360
    setRotation(newRotation)

    try {
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 4000))

      const spinResult = await spinRoulette()
      setResult(spinResult)
      setCanSpin(false)

      if (spinResult.type === 'nothing') {
        hapticError()
      } else {
        hapticSuccess()
      }
    } catch {
      hapticError()
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>🎰 Удача дня</h1>
        <p className={styles.subtitle}>Крути колесо раз в день и получай призы!</p>
      </header>

      {/* Wheel */}
      <div className={styles.wheelContainer}>
        <div className={styles.pointer}>▼</div>
        <div
          className={styles.wheel}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          {prizes.map((prize, i) => (
            <div
              key={i}
              className={styles.segment}
              style={{
                transform: `rotate(${i * 45}deg)`,
                background: `linear-gradient(${90 + i * 45}deg, ${prize.color}22 0%, ${prize.color}44 100%)`,
              }}
            >
              <span
                className={styles.segmentLabel}
                style={{ transform: `rotate(${22.5}deg)` }}
              >
                {prize.label}
              </span>
            </div>
          ))}
          <div className={styles.wheelCenter}>🤠</div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`${styles.result} ${result.type === 'nothing' ? styles.resultLose : styles.resultWin}`}>
          <span className={styles.resultEmoji}>
            {result.type === 'nothing' ? '😔' : '🎉'}
          </span>
          <span className={styles.resultText}>{result.prize}</span>
        </div>
      )}

      {/* Spin button */}
      <button
        className={`${styles.spinBtn} ${!canSpin || spinning ? styles.disabled : ''}`}
        onClick={handleSpin}
        disabled={!canSpin || spinning}
      >
        {spinning ? 'Крутится...' : canSpin ? '🎲 Крутить!' : 'Приходи завтра'}
      </button>

      {/* Rules */}
      <div className={styles.rules}>
        <h3>Правила</h3>
        <ul>
          <li>Одно вращение в день</li>
          <li>Бонусы начисляются мгновенно</li>
          <li>Скидки действуют на следующий заказ</li>
        </ul>
      </div>

      {/* Spacer for nav */}
      <div style={{ height: 100 }} />
    </div>
  )
}
