import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { publishPortfolioBuildId } from './components/ar/arBuildId'
import { captureArRuntimeFlags } from './components/ar/arRuntimeFlags'
import {
  createArRuntimeAudit,
  isArRuntimeAuditEnabled,
} from './components/ar/createArRuntimeAudit'

// Latch URL flags + build id before React mounts (before Beyond the CV / camera).
publishPortfolioBuildId()
captureArRuntimeFlags()

const runtimeAudit = isArRuntimeAuditEnabled()
  ? createArRuntimeAudit({ enabled: true })
  : null
runtimeAudit?.recordPhase?.('script-load')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

runtimeAudit?.recordPhase?.('react-mount')
window.__arRuntimeAuditRoot = runtimeAudit
