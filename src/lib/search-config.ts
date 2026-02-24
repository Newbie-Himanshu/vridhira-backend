/**
 * src/lib/search-config.ts
 *
 * Shared utility for reading and writing the active search provider config.
 * Config is stored in `.search-config.json` at the backend project root.
 * This file is safe to commit (just stores preferences, not secrets).
 */

import fs from "fs"
import path from "path"

export type SearchProvider = "algolia" | "meilisearch" | "default"

export type AlgoliaFeatures = {
  typoTolerance: boolean
  highlights: boolean
  analytics: boolean
  searchableAttributes: string[]
}

export type MeilisearchFeatures = {
  typoTolerance: boolean
  faceting: boolean
  highlighting: boolean
  searchableAttributes: string[]
  filterableAttributes: string[]
  sortableAttributes: string[]
}

export type SearchConfig = {
  activeProvider: SearchProvider
  algoliaFeatures: AlgoliaFeatures
  meilisearchFeatures: MeilisearchFeatures
}

const CONFIG_PATH = path.resolve(process.cwd(), ".search-config.json")

// ── In-memory cache ───────────────────────────────────────────────────────────
// readSearchConfig() is called on every product.created / product.updated event
// AND on every admin sync request. Reading the file synchronously on every call
// blocks the Node.js event loop during bulk product imports.
// A short TTL cache (30 s) eliminates the I/O hot-path while still picking up
// provider changes made in the admin UI within a reasonable time.
const CACHE_TTL_MS = 30_000
let _cachedConfig: SearchConfig | null = null
let _cacheExpiry   = 0

export function invalidateSearchConfigCache(): void {
  _cachedConfig = null
  _cacheExpiry  = 0
}

const DEFAULT_CONFIG: SearchConfig = {
  activeProvider: "default",
  algoliaFeatures: {
    typoTolerance: true,
    highlights: true,
    analytics: false,
    searchableAttributes: ["title", "description", "handle"],
  },
  meilisearchFeatures: {
    typoTolerance: true,
    faceting: true,
    highlighting: true,
    searchableAttributes: ["title", "description", "handle"],
    filterableAttributes: ["categories.name", "tags.value", "status"],
    sortableAttributes: ["title"],
  },
}

export function readSearchConfig(): SearchConfig {
  // Return the cached value if it's still fresh
  if (_cachedConfig && Date.now() < _cacheExpiry) {
    return _cachedConfig
  }

  let loaded: SearchConfig
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8")
      loaded = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    } else {
      loaded = { ...DEFAULT_CONFIG }
    }
  } catch {
    loaded = { ...DEFAULT_CONFIG }
  }

  _cachedConfig = loaded
  _cacheExpiry  = Date.now() + CACHE_TTL_MS
  return loaded
}

export function writeSearchConfig(config: Partial<SearchConfig>): SearchConfig {
  const current = readSearchConfig()
  const updated: SearchConfig = {
    ...current,
    ...config,
    algoliaFeatures: { ...current.algoliaFeatures, ...config.algoliaFeatures },
    meilisearchFeatures: {
      ...current.meilisearchFeatures,
      ...config.meilisearchFeatures,
    },
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8")
  // Bust the cache immediately so the next read reflects the new value
  invalidateSearchConfigCache()
  return updated
}

export function getActiveProvider(): SearchProvider {
  return readSearchConfig().activeProvider
}
