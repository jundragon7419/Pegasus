import { Component, type ErrorInfo, type ReactNode } from 'react'

import Error500 from '@/pages/errors/Error500'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { error: Error | null }

/**
 * 렌더 중 발생한 예외를 잡아 500 화면을 보여준다.
 * React 는 에러 경계를 클래스 컴포넌트로만 만들 수 있다(훅 API 가 없다).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO(백엔드 구축 후): 에러 리포팅으로 보낸다.
    console.error('렌더 중 예외가 발생했습니다.', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return <Error500 error={this.state.error} onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
