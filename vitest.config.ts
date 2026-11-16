import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Local reports may contain archived copies of the repository. Only the
// application's test suite belongs to this project and the frontend CI.
export default mergeConfig(
  viteConfig,
  defineConfig({ test: { include: ['src/**/*.test.{ts,tsx}'] } }),
)
