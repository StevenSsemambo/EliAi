import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('EliAi ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { fallbackTitle = 'Something went wrong', fallbackMessage = 'This section ran into a problem. Your progress is safe.', fallbackLink = '/dashboard', fallbackLinkLabel = '← Back to Dashboard' } = this.props

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0C0F1A' }}>
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-white font-extrabold text-xl mb-2">{fallbackTitle}</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">{fallbackMessage}</p>
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <pre className="text-red-400 text-xs bg-slate-900 rounded-xl p-3 mb-6 max-w-xs text-left overflow-auto max-h-32">
            {this.state.error.message}
          </pre>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="w-full py-3 rounded-2xl font-bold text-black text-sm"
            style={{ background: '#F59E0B' }}
          >
            Try Again
          </button>
          <Link
            to={fallbackLink}
            className="w-full py-3 rounded-2xl font-bold text-sm text-center"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {fallbackLinkLabel}
          </Link>
        </div>
      </div>
    )
  }
}
