import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Target, User } from 'lucide-react'
import { useTelegram } from '../hooks/useUserData'
import styles from './Navigation.module.css'

const navItems = [
  { path: '/', icon: Home, label: 'Салун' },
  { path: '/orders', icon: ClipboardList, label: 'Заказы' },
  { path: '/roulette', icon: Target, label: 'Удача' },
  { path: '/profile', icon: User, label: 'Профиль' },
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
    <motion.nav
      className={styles.nav}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.5
      }}
    >
      <div className={styles.navContainer}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon

          return (
            <motion.button
              key={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => handleClick(item.path)}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {/* Gold spotlight effect for active tab */}
              {isActive && (
                <motion.div
                  className={styles.spotlight}
                  layoutId="spotlight"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <motion.div
                className={styles.iconWrapper}
                animate={{
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className={styles.icon}
                />
              </motion.div>

              <motion.span
                className={styles.label}
                animate={{
                  opacity: isActive ? 1 : 0.6,
                  y: isActive ? 0 : 2
                }}
              >
                {item.label}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </motion.nav>
  )
}
