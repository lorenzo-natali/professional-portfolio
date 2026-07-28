import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { publishPortfolioBuildId } from './components/ar/arBuildId'
import {
  captureArRuntimeFlags,
  getArRuntimeFlags,
} from './components/ar/arRuntimeFlags'
import {
  createArRuntimeAudit,
  isArRuntimeAuditEnabled,
} from './components/ar/createArRuntimeAudit'
import { installArExitTrace } from './components/ar/createArExitTrace'
import { captureSiteDiagMode, getSiteDiagMode } from './diagnostics/siteDiag.js'
import { installPortfolioLifecycleTrace } from './diagnostics/createPortfolioLifecycleTrace.js'
import { PortfolioLifecycleBoundary } from './diagnostics/PortfolioLifecycleBoundary.jsx'
import SiteDiagRoot from './diagnostics/SiteDiagRoot.jsx'

// Latch URL flags + build id before React mounts (before Beyond the CV / camera).
publishPortfolioBuildId()
captureArRuntimeFlags()
captureSiteDiagMode()

const runtimeFlags = getArRuntimeFlags()
const siteDiagMode = getSiteDiagMode()

// Opt-in exit/crash reconstruction trace when any arDiag variant is active.
if (runtimeFlags.arCrashDiag) {
  installArExitTrace({ enabled: true })
}

// Opt-in global portfolio lifecycle trace for siteDiag isolation shells.
const lifecycleTrace = siteDiagMode
  ? installPortfolioLifecycleTrace({ enabled: true })
  : null

const runtimeAudit = isArRuntimeAuditEnabled()
  ? createArRuntimeAudit({ enabled: true })
  : null
runtimeAudit?.recordPhase?.('script-load')

// Earliest page-boot evidence for rotate-audit sessions (opt-in URL flag only).
if (runtimeFlags.arRotateAudit) {
  void import('./components/ar/arRotateAudit').then((mod) => {
    mod.recordArRotateAuditPageBoot()
  })
}

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    {siteDiagMode ? (
      <PortfolioLifecycleBoundary>
        <SiteDiagRoot mode={siteDiagMode} />
      </PortfolioLifecycleBoundary>
    ) : (
      <App />
    )}
  </StrictMode>,
)

lifecycleTrace?.recordReactRootMount?.()
runtimeAudit?.recordPhase?.('react-mount')
window.__arRuntimeAuditRoot = runtimeAudit
