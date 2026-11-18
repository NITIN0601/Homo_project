import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initGlobalTelemetryListeners } from './utils/telemetry.ts'
import { initCacheReloadListeners } from './utils/cacheReload.ts'

// Initialize HIPAA-compliant technical error telemetry
initGlobalTelemetryListeners()

// Initialize deployment auto-cache recovery and stale chunk reload
initCacheReloadListeners()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
