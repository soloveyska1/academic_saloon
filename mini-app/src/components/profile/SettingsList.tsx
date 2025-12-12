import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  BellOff,
  Tag,
  Clock,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  Shield,
  BookOpen,
} from 'lucide-react'
import { ProfileSettings } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS LIST - Profile settings configuration
// ═══════════════════════════════════════════════════════════════════════════════

interface SettingsListProps {
  settings: ProfileSettings
  onToggle: (section: keyof ProfileSettings, key: string, value: boolean) => void
  onNavigate: (target: 'rules' | 'faq' | 'support' | 'terms' | 'privacy') => void
}

interface ToggleProps {
  enabled: boolean
  onChange: () => void
}

const Toggle = memo(function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <motion.button
      onClick={onChange}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        background: enabled ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
        padding: 2,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <motion.div
        animate={{ x: enabled ? 18 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: '#fff',
        }}
      />
    </motion.button>
  )
})

interface SettingRowProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  title: string
  subtitle?: string
  action: React.ReactNode
  onClick?: () => void
}

const SettingRow = memo(function SettingRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  action,
  onClick,
}: SettingRowProps) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.02)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </motion.div>
  )
})

export const SettingsList = memo(function SettingsList({
  settings,
  onToggle,
  onNavigate,
}: SettingsListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Notifications Section */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          Уведомления
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SettingRow
            icon={<Bell size={18} />}
            iconColor="#3B82F6"
            iconBg="rgba(59, 130, 246, 0.15)"
            title="Обновления заказов"
            subtitle="Статусы, сообщения, файлы"
            action={
              <Toggle
                enabled={settings.notifications.orderUpdates}
                onChange={() => onToggle('notifications', 'orderUpdates', !settings.notifications.orderUpdates)}
              />
            }
          />
          <SettingRow
            icon={<Tag size={18} />}
            iconColor="#D4AF37"
            iconBg="rgba(212, 175, 55, 0.15)"
            title="Акции и скидки"
            subtitle="Промокоды, бонусы"
            action={
              <Toggle
                enabled={settings.notifications.promotions}
                onChange={() => onToggle('notifications', 'promotions', !settings.notifications.promotions)}
              />
            }
          />
          <SettingRow
            icon={<Clock size={18} />}
            iconColor="#A78BFA"
            iconBg="rgba(167, 139, 250, 0.15)"
            title="Напоминания"
            subtitle="Дедлайны, оплата"
            action={
              <Toggle
                enabled={settings.notifications.reminders}
                onChange={() => onToggle('notifications', 'reminders', !settings.notifications.reminders)}
              />
            }
          />
        </div>
      </div>

      {/* Privacy Section */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          Приватность
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SettingRow
            icon={settings.privacy.showOnlineStatus ? <Eye size={18} /> : <EyeOff size={18} />}
            iconColor="#22c55e"
            iconBg="rgba(34, 197, 94, 0.15)"
            title="Показывать онлайн-статус"
            subtitle="Виден менеджерам"
            action={
              <Toggle
                enabled={settings.privacy.showOnlineStatus}
                onChange={() => onToggle('privacy', 'showOnlineStatus', !settings.privacy.showOnlineStatus)}
              />
            }
          />
        </div>
      </div>

      {/* Info & Help Section */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          Информация
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SettingRow
            icon={<BookOpen size={18} />}
            iconColor="#D4AF37"
            iconBg="rgba(212, 175, 55, 0.15)"
            title="Как это работает"
            subtitle="Правила программы лояльности"
            action={<ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />}
            onClick={() => onNavigate('rules')}
          />
          <SettingRow
            icon={<HelpCircle size={18} />}
            iconColor="#3B82F6"
            iconBg="rgba(59, 130, 246, 0.15)"
            title="Частые вопросы"
            action={<ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />}
            onClick={() => onNavigate('faq')}
          />
          <SettingRow
            icon={<MessageCircle size={18} />}
            iconColor="#22c55e"
            iconBg="rgba(34, 197, 94, 0.15)"
            title="Поддержка"
            subtitle="Связаться с нами"
            action={<ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />}
            onClick={() => onNavigate('support')}
          />
          <SettingRow
            icon={<FileText size={18} />}
            iconColor="#6B7280"
            iconBg="rgba(107, 114, 128, 0.15)"
            title="Условия использования"
            action={<ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />}
            onClick={() => onNavigate('terms')}
          />
          <SettingRow
            icon={<Shield size={18} />}
            iconColor="#6B7280"
            iconBg="rgba(107, 114, 128, 0.15)"
            title="Политика конфиденциальности"
            action={<ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />}
            onClick={() => onNavigate('privacy')}
          />
        </div>
      </div>
    </motion.div>
  )
})
