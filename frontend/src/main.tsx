import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initGlobalTelemetryListeners } from './utils/telemetry.ts'

// Initialize HIPAA-compliant technical error telemetry
initGlobalTelemetryListeners()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
