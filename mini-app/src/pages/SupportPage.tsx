import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones } from 'lucide-react'
import { FloatingParticles } from '../components/ui/PremiumDesign'
import { SupportChat } from '../components/support/SupportChat'

export function SupportPage() {
  return (
    <div
      className="app-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)', // Adjust for bottom nav
        background: 'var(--bg-main)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <FloatingParticles />

      {/* Compact Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '16px 16px 10px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #d4af37, #8b6914)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
            }}
          >
            <Headphones size={18} color="#0a0a0c" />
          </motion.div>

          <div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 800,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              Чат с поддержкой
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Мы онлайн 24/7
            </p>
          </div>
        </div>
      </motion.header>

      {/* Chat Area - Flex Grow */}
      <div style={{ flex: 1, position: 'relative', zIndex: 2, overflow: 'hidden' }}>
        <SupportChat />
      </div>

    </div>
  )
}
