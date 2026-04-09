import { motion } from 'framer-motion'
import { BookOpen, LayoutGrid, MessageCircle, PenSquare, Star } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

const items = [
  { to: '/', label: 'Каталог', icon: BookOpen, end: true },
  { to: '/categories', label: 'Разделы', icon: LayoutGrid },
  { to: '/favorites', label: 'Избранное', icon: Star },
  { to: '/order', label: 'Заказать', icon: PenSquare },
  { to: '/support', label: 'Связь', icon: MessageCircle },
]

interface BottomNavProps {
  favoriteCount: number
}

export function BottomNav({ favoriteCount }: BottomNavProps) {
  const location = useLocation()

  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={isActive ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'}
          >
            {isActive ? (
              <motion.span
                className="bottom-nav__active-pill"
                layoutId="bottom-nav-active-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="bottom-nav__item-inner">
              <Icon size={17} strokeWidth={1.8} />
              <span>{item.label}</span>
            </span>
            {item.to === '/favorites' && favoriteCount > 0 ? (
              <span className="bottom-nav__badge">{favoriteCount > 9 ? '9+' : favoriteCount}</span>
            ) : null}
          </NavLink>
        )
      })}
    </nav>
  )
}
