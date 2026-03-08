import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  sectionName: string
  resetKey?: string | number
  context?: Record<string, unknown>
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SectionErrorBoundary] ${this.props.sectionName}`, {
      error,
      errorInfo,
      context: this.props.context,
    })
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }

    return this.props.children
  }
}
