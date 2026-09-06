'use strict'

const fs   = require('fs')
const path = require('path')

// Directories never scanned, regardless of content.
const IGNORE_DIRS = new Set([
  '.git', 'node_modules', 'venv', '.venv', '__pycache__',
  'dist', 'build', 'coverage', '.next', '.cache',
  '.contextbridge', '.idea', '.vscode'
])

// Extensions read for content. Filenames without an extension (Dockerfile,
// requirements.txt-style exact names) are matched separately below.
const SUPPORTED_EXTENSIONS = new Set([
  '.py', '.js', '.jsx', '.ts', '.tsx',
  '.json', '.md', '.txt',
  '.yaml', '.yml', '.toml', '.ini'
])

// Exact filenames (case-sensitive) always considered supported, even
// without a recognized extension.
const SUPPORTED_EXACT_NAMES = new Set([
  'requirements.txt', 'package.json', 'Dockerfile', '.env.example'
])

// Filenames matched by prefix — covers docker-compose.yml,
// docker-compose.prod.yaml, docker-compose.override.yml, etc.
const SUPPORTED_PREFIXES = ['docker-compose']

// Files that must never be read or uploaded, even if their extension
// would otherwise qualify.
function isSensitive(name) {
  if (name === '.env.example') return false // explicitly allowed
  if (name === '.env' || name.startsWith('.env.')) return true
  if (/\.(pem|key|crt|cer|p12|pfx)$/i.test(name)) return true
  if (/^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i.test(name)) return true
  // Whole-word match only — avoids false positives like token_counter.py
  if (/(^|[-_.])(secret|password|credentials?)([-_.]|$)/i.test(name)) return true
  return false
}

function isSupported(name) {
  if (SUPPORTED_EXACT_NAMES.has(name)) return true
  if (SUPPORTED_PREFIXES.some(p => name.startsWith(p))) return true
  const ext = path.extname(name)
  return SUPPORTED_EXTENSIONS.has(ext)
}

const MAX_FILE_SIZE_BYTES = 200 * 1024   // skip individual files bigger than this
const MAX_FILES           = 300          // hard cap on total files scanned
const MAX_DEPTH           = 12

/**
 * Recursively scan a project directory.
 * Returns { files, stats } where files is an array of
 * { path (posix-style, relative to root), content, size } and
 * stats reports what was found/skipped for CLI reporting.
 */
function scanProject(rootDir) {
  const files = []
  const stats = {
    scanned: 0,
    included: 0,
    ignoredDirs: 0,
    skippedSensitive: 0,
    skippedTooLarge: 0,
    skippedUnsupported: 0,
    truncatedAtLimit: false
  }

  function walk(dir, depth) {
    if (depth > MAX_DEPTH) return
    if (files.length >= MAX_FILES) {
      stats.truncatedAtLimit = true
      return
    }

    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        stats.truncatedAtLimit = true
        return
      }

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) {
          stats.ignoredDirs++
          continue
        }
        walk(path.join(dir, entry.name), depth + 1)
        continue
      }

      if (!entry.isFile()) continue

      stats.scanned++

      if (isSensitive(entry.name)) {
        stats.skippedSensitive++
        continue
      }

      if (!isSupported(entry.name)) {
        stats.skippedUnsupported++
        continue
      }

      const absPath = path.join(dir, entry.name)
      let stat
      try {
        stat = fs.statSync(absPath)
      } catch {
        continue
      }

      if (stat.size > MAX_FILE_SIZE_BYTES) {
        stats.skippedTooLarge++
        continue
      }

      let content
      try {
        content = fs.readFileSync(absPath, 'utf8')
      } catch {
        continue
      }

      const relPath = path.relative(rootDir, absPath).split(path.sep).join('/')
      files.push({ path: relPath, content, size: stat.size })
      stats.included++
    }
  }

  walk(rootDir, 0)

  return { files, stats }
}

module.exports = { scanProject, isSensitive, isSupported, IGNORE_DIRS }