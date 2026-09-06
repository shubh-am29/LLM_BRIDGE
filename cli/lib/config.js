const fs   = require('fs')
const path = require('path')
const os   = require('os')

// Local config — lives inside the project's .contextbridge/ folder
// Never commit project_id and backend_url — add .contextbridge/ to .gitignore
const LOCAL_CONFIG_FILE  = '.contextbridge/config.json'

// Global config — lives in the user's home directory
const GLOBAL_CONFIG_DIR  = path.join(os.homedir(), '.contextbridge')
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json')

const DEFAULT_BACKEND = 'http://127.0.0.1:8000'

// ── Global config (backend URL default) ──────────────────────────────────────

function readGlobalConfig() {
  try {
    if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf8'))
    }
  } catch {}
  return {}
}

function writeGlobalConfig(data) {
  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(data, null, 2))
}

// ── Local config (project-specific) ──────────────────────────────────────────

function readLocalConfig() {
  try {
    const filePath = path.join(process.cwd(), LOCAL_CONFIG_FILE)
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch {}
  return null
}

function writeLocalConfig(data) {
  const dir      = path.join(process.cwd(), '.contextbridge')
  const filePath = path.join(dir, 'config.json')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function requireLocalConfig() {
  const cfg = readLocalConfig()
  if (!cfg) {
    console.error(
      require('chalk').red(
        '✗ No .contextbridge/config.json found.\n' +
        '  Run contextbridge init first.'
      )
    )
    process.exit(1)
  }
  return cfg
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Resolution order (highest priority first):
//   1. CONTEXTBRIDGE_API_URL environment variable (explicit runtime override)
//   2. Local project config (.contextbridge/config.json) — set by `ctxbridge init`
//   3. Global config (~/.contextbridge/config.json)
//   4. DEFAULT_BACKEND
function getBackendUrl() {
  if (process.env.CONTEXTBRIDGE_API_URL) {
    return process.env.CONTEXTBRIDGE_API_URL
  }
  const local  = readLocalConfig()
  const global = readGlobalConfig()
  return (local && local.backend_url) || global.backend_url || DEFAULT_BACKEND
}

function ensureGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  const entry         = '.contextbridge/config.json'

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8')
    if (!content.includes(entry)) {
      fs.appendFileSync(gitignorePath, `\n# ContextBridge local config (contains project ID)\n${entry}\n`)
      return true
    }
  }
  return false
}

module.exports = {
  readLocalConfig,
  writeLocalConfig,
  requireLocalConfig,
  readGlobalConfig,
  writeGlobalConfig,
  getBackendUrl,
  ensureGitignore,
  LOCAL_CONFIG_FILE,
  DEFAULT_BACKEND
}