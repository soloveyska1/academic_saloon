import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus } from 'lucide-react'
import { GoldText } from '../components/ui/GoldText'

// Mock data for now (will be replaced with API)
const MOCK_SQUADS = [
  { id: 1, name: 'Золотой столик', members: 5, score: 12450, rank: 1 },
  { id: 2, name: 'Алмазная ложа', members: 4, score: 9800, rank: 2 },
  { id: 3, name: 'Серебряный круг', members: 6, score: 8200, rank: 3 },
  { id: 4, name: 'Бронзовый клуб', members: 3, score: 5100, rank: 4 },
  { id: 5, name: 'Рубиновый зал', members: 4, score: 3900, rank: 5 },
]

export function SquadPage() {
  const navigate = useNavigate()
  const [userSquad] = useState<typeof MOCK_SQUADS[0] | null>(null) // null = no squad yet

  return (
    <main style={{
      minHeight: '100dvh',
      background: 'var(--bg-void)',
      padding: '0 16px',
      paddingTop: 'max(16px, env(safe-area-inset-top))',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <GoldText variant="static" size="lg" weight={700}>Столики</GoldText>
      </div>

      {/* Hero section */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🪑</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Соревнуйтесь командой
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Объединяйтесь в столики, набирайте очки вместе и получайте эксклюзивные бонусы
        </p>
      </div>

      {/* Create squad button */}
      {!userSquad && (
        <motion.button whileTap={{ scale: 0.97 }} style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          border: 'none',
          background: 'var(--gold-metallic)',
          color: 'var(--text-on-gold)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: 'var(--glow-gold)',
        }}>
          <Plus size={18} />
          Создать столик
        </motion.button>
      )}

      {/* Leaderboard */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 12,
        }}>
          Топ столиков этой недели
        </div>

        {MOCK_SQUADS.map((squad) => (
          <motion.div key={squad.id} whileTap={{ scale: 0.98 }} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            marginBottom: 8,
            borderRadius: 12,
            background: squad.rank <= 3 ? 'rgba(212,175,55,0.04)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${squad.rank <= 3 ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.04)'}`,
            cursor: 'pointer',
          }}>
            {/* Rank */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: squad.rank === 1 ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
              fontSize: squad.rank <= 3 ? 14 : 12,
              fontWeight: 700,
              color: squad.rank === 1 ? 'var(--gold-400)' : squad.rank <= 3 ? 'var(--gold-300)' : 'var(--text-muted)',
            }}>
              {squad.rank <= 3 ? ['🥇', '🥈', '🥉'][squad.rank - 1] : squad.rank}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                {squad.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {squad.members} участн. · {squad.score.toLocaleString('ru-RU')} очков
              </div>
            </div>

            {/* Join button */}
            <button style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(212,175,55,0.15)',
              background: 'rgba(212,175,55,0.06)',
              color: 'var(--gold-400)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}>
              Вступить
            </button>
          </motion.div>
        ))}
      </div>

      {/* How it works */}
      <div style={{
        padding: '16px',
        borderRadius: 12,
        marginBottom: 32,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Как это работает
        </div>
        {[
          { icon: '🪑', text: 'Создайте столик или присоединитесь к существующему' },
          { icon: '📈', text: 'Заказы и активность каждого участника приносят очки столику' },
          { icon: '🏆', text: 'Топ-3 столика каждую неделю получают бонусные баллы' },
          { icon: '👥', text: 'Приглашайте друзей — больше участников = больше очков' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 3 ? 10 : 0, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
