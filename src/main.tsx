import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { startSession } from './auth/session'
import './styles.css'

async function main() {
  // There is no real backend: the MSW worker answers every API call.
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
  void startSession()

  const root = document.getElementById('root')
  if (!root) throw new Error('#root element is missing')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void main()
