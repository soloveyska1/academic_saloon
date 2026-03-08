import React, { memo } from 'react'
import {
  LayoutDashboard, Package, Users, Tag, Radio,
  ScrollText, Terminal, Megaphone,
} from 'lucide-react'
import type { TabId } from './godHelpers'
import s from '../../pages/GodModePage.module.css'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Сводка', icon: <LayoutDashboard size={14} /> },
  { id: 'orders', label: 'Заказы', icon: <Package size={14} /> },
  { id: 'users', label: 'Клиенты', icon: <Users size={14} /> },
  { id: 'promos', label: 'Промо', icon: <Tag size={14} /> },
  { id: 'live', label: 'Онлайн', icon: <Radio size={14} /> },
  { id: 'logs', label: 'Лог', icon: <ScrollText size={14} /> },
  { id: 'sql', label: 'SQL', icon: <Terminal size={14} /> },
  { id: 'broadcast', label: 'Рассылка', icon: <Megaphone size={14} /> },
]

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export const GodTabBar = memo(function GodTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className={s.tabBar}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`${s.tabButton} ${activeTab === tab.id ? s.tabActive : ''}`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
})
