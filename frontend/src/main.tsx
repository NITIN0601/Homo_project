import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
import { initGlobalTelemetryListeners } from './core/observability'
import { initCacheReloadListeners } from './core/api/query/cacheReload'

// Initialize HIPAA-compliant technical error telemetry
initGlobalTelemetryListeners()

// Initialize deployment auto-cache recovery and stale chunk reload
initCacheReloadListeners()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
