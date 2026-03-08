import React, { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Home, Package, Users, Tag, Radio,
  ScrollText, Terminal, Bell,
} from 'lucide-react'
import type { TabId } from './godHelpers'
import s from '../../pages/GodModePage.module.css'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Центр', icon: <Home size={18} /> },
  { id: 'orders', label: 'Заказы', icon: <Package size={18} /> },
  { id: 'users', label: 'Клиенты', icon: <Users size={18} /> },
  { id: 'promos', label: 'Промокоды', icon: <Tag size={18} /> },
  { id: 'live', label: 'Онлайн', icon: <Radio size={18} /> },
  { id: 'logs', label: 'Журнал', icon: <ScrollText size={18} /> },
  { id: 'sql', label: 'Запросы', icon: <Terminal size={18} /> },
  { id: 'broadcast', label: 'Рассылка', icon: <Bell size={18} /> },
]

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export const GodTabBar = memo(function GodTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className={s.tabBar}>
      {TABS.map((tab) => (
        <motion.button
          key={tab.id}
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => onTabChange(tab.id)}
          className={`${s.tabButton} ${activeTab === tab.id ? s.tabActive : ''}`}
        >
          {tab.icon}
          {tab.label}
        </motion.button>
      ))}
    </div>
  )
})
