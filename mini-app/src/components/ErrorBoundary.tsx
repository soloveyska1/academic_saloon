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
    // Log error in development
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
          background: '#0a0a0c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 24,
        }}>
          {/* Error Icon */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlertTriangle size={40} color="#ef4444" />
          </div>

          {/* Error Message */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24,
              fontWeight: 700,
              color: '#f2f2f2',
              margin: 0,
              marginBottom: 12,
            }}>
              Что-то пошло не так
            </h2>
            <p style={{
              fontSize: 14,
              color: '#71717a',
              margin: 0,
              lineHeight: 1.6,
            }}>
              Произошла ошибка в приложении.<br />
              Попробуйте обновить страницу.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 600,
                color: '#050505',
                background: 'linear-gradient(180deg, #f5d061, #d4af37)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RefreshCw size={18} />
              Обновить
            </button>

            <button
              onClick={this.handleGoHome}
              style={{
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 600,
                color: '#f2f2f2',
                background: '#14141a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Home size={18} />
              На главную
            </button>
          </div>

          {/* Error Details (dev only) */}
          {import.meta.env.DEV && this.state.error && (
            <div style={{
              marginTop: 24,
              padding: 16,
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
              maxWidth: '100%',
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
