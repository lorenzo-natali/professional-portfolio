import { publishPortfolioBuildId } from './components/ar/arBuildId'
import {
  captureArRuntimeFlags,
  getArRuntimeFlags,
} from './components/ar/arRuntimeFlags'
import { captureSiteDiagMode, getSiteDiagMode } from './diagnostics/siteDiag.js'
import './index.css'

// Latch URL flags + build id before any App / Beyond chunk loads.
publishPortfolioBuildId()
captureArRuntimeFlags()
captureSiteDiagMode()

const siteDiagMode = getSiteDiagMode()
const runtimeFlags = getArRuntimeFlags()

if (siteDiagMode) {
  // siteDiag path: App + beyondBundle are NOT statically imported from this entry.
  const { bootSiteDiag } = await import('./diagnostics/bootSiteDiag.jsx')
  bootSiteDiag(siteDiagMode)
} else {
  // Production path: dedicated boot module eagerly pulls App + beyondBundle.
  // Rotate-audit earliest page-boot stays inside bootProduction (opt-in URL only).
  if (runtimeFlags.arRotateAudit) {
    const audit = await import('./components/ar/arRotateAudit')
    audit.recordArRotateAuditPageBoot()
  }
  const { bootProduction } = await import('./bootProduction.jsx')
  bootProduction()
}
