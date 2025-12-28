import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#09090b', // Darker black
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 32,
          fontFamily: "'Manrope', sans-serif"
        }}>
          {/* Error Icon */}
          <div style={{
            position: 'relative',
            width: 100,
            height: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Glow */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
              zIndex: 0
            }} />

            <div style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
              border: '1px solid rgba(212,175,55,0.3)',
              boxShadow: '0 0 30px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1
            }}>
              <AlertTriangle size={40} color="#d4af37" strokeWidth={1.5} />
            </div>
          </div>

          {/* Error Message */}
          <div style={{ textAlign: 'center', maxWidth: 320, zIndex: 1 }}>
            <h2 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 28,
              fontWeight: 700,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 16px 0',
            }}>
              Ошибка
            </h2>
            <p style={{
              fontSize: 15,
              color: '#a1a1aa',
              margin: 0,
              lineHeight: 1.6,
            }}>
              К сожалению, произошла непредвиденная ошибка. Мы уже работаем над исправлением.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
            maxWidth: 280,
            zIndex: 1
          }}>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: 16,
                fontWeight: 700,
                color: '#09090b',
                background: 'linear-gradient(90deg, #d4af37 0%, #fcd34d 50%, #d4af37 100%)',
                backgroundSize: '200% auto',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 20px rgba(212,175,55,0.2)'
              }}
            >
              <RefreshCw size={18} />
              Обновить страницу
            </button>

            <button
              onClick={this.handleGoHome}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: 16,
                fontWeight: 600,
                color: '#a1a1aa',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Home size={18} />
              На главную
            </button>
          </div>

          {/* Dev Details */}
          {import.meta.env.DEV && this.state.error && (
            <div style={{
              marginTop: 24,
              padding: 16,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12,
              maxWidth: '100%',
              width: '100%',
              overflow: 'auto',
            }}>
              <p style={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#ef4444',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error.message}
              </p>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
