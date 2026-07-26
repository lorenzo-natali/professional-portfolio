import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

function readGitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

const PORTFOLIO_COMMIT = readGitShortSha()
const PORTFOLIO_BUILD_TIME = new Date().toISOString()
const PORTFOLIO_BUILD_ID = `${PORTFOLIO_COMMIT}+${PORTFOLIO_BUILD_TIME}`

const INTEREST_SOURCE_GLBS = [
  'robot.glb',
  'evil-eye.glb',
  'book.glb',
  'fossil.glb',
  'backpack.glb',
  'plant.glb',
]

/**
 * Keep source interest GLBs in `public/` for the optimize pipeline + DEV compare,
 * but strip them from production `dist` so deploy only ships web-optimized assets.
 */
function stripInterestSourceGlbsFromDist() {
  return {
    name: 'strip-interest-source-glbs-from-dist',
    apply: 'build',
    closeBundle() {
      const interestsDir = join(rootDir, 'dist/ar/interests')
      if (!existsSync(interestsDir)) return
      for (const name of INTEREST_SOURCE_GLBS) {
        const full = join(interestsDir, name)
        if (existsSync(full)) unlinkSync(full)
      }
      // Guard: never delete web/ outputs.
      const webDir = join(interestsDir, 'web')
      if (existsSync(webDir)) {
        const webFiles = readdirSync(webDir).filter((f) => f.endsWith('.glb'))
        if (webFiles.length < 6) {
          this.warn(`[strip-interest-source] expected 6 web GLBs, found ${webFiles.length}`)
        }
      }
    },
  }
}

/** DEV-only MindAR experiments must not ship in production dist. */
function stripArTargetExperimentsFromDist() {
  return {
    name: 'strip-ar-target-experiments-from-dist',
    apply: 'build',
    closeBundle() {
      const expDir = join(rootDir, 'dist/ar/targets/experiments')
      if (!existsSync(expDir)) return
      for (const name of readdirSync(expDir)) {
        unlinkSync(join(expDir, name))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __PORTFOLIO_COMMIT__: JSON.stringify(PORTFOLIO_COMMIT),
    __PORTFOLIO_BUILD_TIME__: JSON.stringify(PORTFOLIO_BUILD_TIME),
    __PORTFOLIO_BUILD_ID__: JSON.stringify(PORTFOLIO_BUILD_ID),
  },
  plugins: [
    react(),
    tailwindcss(),
    stripInterestSourceGlbsFromDist(),
    stripArTargetExperimentsFromDist(),
  ],
  optimizeDeps: {
    exclude: ['mind-ar'],
  },
  build: {
    commonjsOptions: {
      include: [/mind-ar/, /node_modules/],
    },
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        // DEV compare page for original vs web-optimized interest GLBs.
        arInterestsCompare: resolve(rootDir, 'ar-interests-compare.html'),
        // DEV MindAR tracking-feature experiment (does not touch live target).
        arTrackingFeaturesExperiment: resolve(
          rootDir,
          'ar-tracking-features-experiment.html',
        ),
        // DEV orientation calibration for interest GLBs (no MindAR).
        arInterestOrientation: resolve(rootDir, 'ar-interest-orientation.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
