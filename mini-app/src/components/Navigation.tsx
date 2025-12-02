import { useLocation, useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useUserData'
import styles from './Navigation.module.css'

const navItems = [
  { path: '/', icon: '🏠', label: 'Главная' },
  { path: '/orders', icon: '📋', label: 'Заказы' },
  { path: '/roulette', icon: '🎰', label: 'Удача' },
]

export function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  const handleClick = (path: string) => {
    haptic('light')
    navigate(path)
  }

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <button
          key={item.path}
          className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
          onClick={() => handleClick(item.path)}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
