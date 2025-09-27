import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Handle third-party extension conflicts gracefully
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found. This might be due to a browser extension conflict.')
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
