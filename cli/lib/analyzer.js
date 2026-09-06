'use strict'

const path = require('path')

// Maps file extension → language label.
const LANGUAGE_BY_EXT = {
  '.py':  'Python',
  '.js':  'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.ts':  'TypeScript',
  '.tsx': 'TypeScript (React)',
}

// Dependency name → display label, checked against package.json deps
// and requirements.txt lines.
const FRAMEWORK_SIGNATURES = [
  { pattern: /\bfastapi\b/i,      label: 'FastAPI' },
  { pattern: /\buvicorn\b/i,      label: 'Uvicorn' },
  { pattern: /\bflask\b/i,        label: 'Flask' },
  { pattern: /\bdjango\b/i,       label: 'Django' },
  { pattern: /\bpydantic\b/i,     label: 'Pydantic' },
  { pattern: /\bsupabase\b/i,     label: 'Supabase' },
  { pattern: /"react"\s*:/i,      label: 'React' },
  { pattern: /"next"\s*:/i,       label: 'Next.js' },
  { pattern: /"vue"\s*:/i,        label: 'Vue' },
  { pattern: /"express"\s*:/i,    label: 'Express' },
  { pattern: /"vite"\s*:/i,       label: 'Vite' },
  { pattern: /"commander"\s*:/i,  label: 'Commander' },
  { pattern: /"axios"\s*:/i,      label: 'Axios' },
  { pattern: /"tailwindcss"\s*:/i,label: 'Tailwind CSS' },
]

// Only matches when TODO/FIXME starts an actual comment line — avoids
// matching the words when they appear inside strings, regexes, or
// unrelated code (e.g. this very file's own pattern definitions).
const TODO_RE  = /^\s*(?:#|\/\/|\*|<!--)\s*(TODO)\b[:\-\s]*(.+)/i
const FIXME_RE = /^\s*(?:#|\/\/|\*|<!--)\s*(FIXME)\b[:\-\s]*(.+)/i

const MAX_TODOS         = 15
const MAX_KNOWN_ISSUES  = 10
const MAX_AGENT_INSTRUCTION_LINES = 15

function detectLanguages(files) {
  const counts = {}
  for (const f of files) {
    const ext = path.extname(f.path)
    const lang = LANGUAGE_BY_EXT[ext]
    if (lang) counts[lang] = (counts[lang] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
}

function detectFrameworks(files) {
  const found = new Set()
  for (const f of files) {
    const name = path.basename(f.path)
    // Only trust dependency manifests — scanning arbitrary source files
    // produces false positives (e.g. a string or comment mentioning
    // "flask" or "django" without it being an actual dependency).
    if (name === 'package.json' || name === 'requirements.txt') {
      for (const sig of FRAMEWORK_SIGNATURES) {
        if (sig.pattern.test(f.content)) found.add(sig.label)
      }
    }
  }
  return [...found]
}

function detectTopLevelDirs(files) {
  const dirs = new Set()
  for (const f of files) {
    const parts = f.path.split('/')
    if (parts.length > 1) dirs.add(parts[0])
  }
  return [...dirs].sort()
}

function detectEntryPoints(files) {
  const candidates = [
    'main.py', 'app.py', 'manage.py',
    'index.js', 'server.js', 'app.js',
  ]
  const found = []
  for (const f of files) {
    const base = path.basename(f.path)
    if (candidates.includes(base)) found.push(f.path)
    // package.json "bin" or "main" entries are a strong signal
    if (base === 'package.json') {
      try {
        const pkg = JSON.parse(f.content)
        if (pkg.main) found.push(posixJoin(path.dirname(f.path), pkg.main))
        if (pkg.bin) {
          const binVal = typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0]
          if (binVal) found.push(posixJoin(path.dirname(f.path), binVal))
        }
      } catch { /* ignore malformed package.json */ }
    }
  }
  return [...new Set(found)]
}

function posixJoin(dir, rel) {
  if (dir === '.') return rel.replace(/^\.\//, '')
  return `${dir}/${rel}`.replace(/^\.\//, '')
}

function extractMarkedComments(files, regex, maxCount) {
  const results = []
  for (const f of files) {
    if (!/\.(py|js|jsx|ts|tsx)$/.test(f.path)) continue
    const lines = f.content.split('\n')
    for (let i = 0; i < lines.length && results.length < maxCount; i++) {
      const match = lines[i].match(regex)
      if (match) {
        const text = match[2].trim().replace(/[*/]+$/, '').trim()
        if (text) results.push(`${text} (${f.path}:${i + 1})`)
      }
    }
    if (results.length >= maxCount) break
  }
  return results
}

function extractAgentInstructions(files) {
  const instructionFiles = files.filter(f =>
    ['AGENTS.md', 'CLAUDE.md', '.cursorrules'].includes(path.basename(f.path))
  )
  const lines = []
  for (const f of instructionFiles) {
    const content = f.content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
    lines.push(...content)
    if (lines.length >= MAX_AGENT_INSTRUCTION_LINES) break
  }
  return lines.slice(0, MAX_AGENT_INSTRUCTION_LINES)
}

/**
 * Analyze scanned files and produce a memory patch matching the fields
 * the backend actually stores (see backend/app/api/memory.py EMPTY_MEMORY):
 *   project_overview (text), requirements (list), architecture (text),
 *   technologies (list), current_progress (list), key_decisions (list),
 *   pending_tasks (list), known_issues (list), agent_instructions (list)
 *
 * Only fields with something reasonably derivable are included in the
 * returned patch. key_decisions is intentionally never populated here —
 * it cannot be safely inferred from file contents, and is left for the
 * user or a future LLM-based analyzer to fill in.
 */
function analyzeProject(files) {
  const languages       = detectLanguages(files)
  const frameworks      = detectFrameworks(files)
  const topLevelDirs     = detectTopLevelDirs(files)
  const entryPoints      = detectEntryPoints(files)
  const todos            = extractMarkedComments(files, TODO_RE, MAX_TODOS)
  const knownIssues      = extractMarkedComments(files, FIXME_RE, MAX_KNOWN_ISSUES)
  const agentInstructions = extractAgentInstructions(files)

  const technologies = [...languages, ...frameworks]

  const overviewParts = []
  if (languages.length > 0) {
    overviewParts.push(`This project uses ${languages.join(', ')}`)
  }
  if (frameworks.length > 0) {
    overviewParts.push(`with ${frameworks.join(', ')}`)
  }
  const projectOverview = overviewParts.length > 0
    ? overviewParts.join(' ') + '.'
    : ''

  let architecture = ''
  if (topLevelDirs.length > 0) {
    architecture = `The project is organized into the following top-level directories: ${topLevelDirs.join(', ')}.`
    if (entryPoints.length > 0) {
      architecture += ` Detected entry point(s): ${entryPoints.join(', ')}.`
    }
  }

  const currentProgress = []
  if (files.length > 0) {
    currentProgress.push(`${files.length} source/config file(s) scanned across ${topLevelDirs.length || 1} top-level director${topLevelDirs.length === 1 ? 'y' : 'ies'}.`)
  }
  if (technologies.length > 0) {
    currentProgress.push(`Detected stack: ${technologies.join(', ')}.`)
  }

  const patch = {}
  if (projectOverview)          patch.project_overview   = projectOverview
  if (architecture)             patch.architecture        = architecture
  if (technologies.length > 0)  patch.technologies         = technologies
  if (currentProgress.length)   patch.current_progress     = currentProgress
  if (todos.length > 0)         patch.pending_tasks        = todos
  if (knownIssues.length > 0)   patch.known_issues         = knownIssues
  if (agentInstructions.length) patch.agent_instructions   = agentInstructions

  return {
    patch,
    detected: {
      languages,
      frameworks,
      top_level_dirs: topLevelDirs,
      entry_points: entryPoints,
      file_count: files.length
    }
  }
}

module.exports = { analyzeProject }