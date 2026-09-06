'use strict'

const chalk = require('chalk')
const ora   = require('ora')
const { requireLocalConfig } = require('../lib/config')
const {
  fetchProject, fetchMemory, fetchCompleteness,
  fetchSessions, fetchVersions, pingBackend
} = require('../lib/api')
const { fileExists, getFileStat, readFile } = require('../lib/files')
const detector = require('../lib/project-detector')

function timeAgo(dateStr) {
  if (!dateStr) return 'never'
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function scoreBar(score) {
  const filled = Math.round(score / 10)
  const empty  = 10 - filled
  const color  = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red
  return (
    color('█'.repeat(filled)) +
    chalk.dim('░'.repeat(empty)) +
    ' ' + color(`${score}%`)
  )
}

function confidenceColor(n) {
  if (n >= 80) return chalk.green
  if (n >= 50) return chalk.yellow
  return chalk.red
}

async function status(options) {
  console.log(chalk.bold.blue('\n  ContextBridge Status\n'))

  const config = requireLocalConfig()
  const { project_id, backend_url, project_name, last_synced } = config

  // Live detection
  let detected = null
  try { detected = detector.detect(process.cwd()) } catch {}

  // Cached profile fallback
  const profile = readFile('project-profile.json') || {}

  const typeLabel        = detected?.project_type_label  || profile.project_type_label || 'Unknown'
  const confidence       = detected?.confidence          ?? profile.confidence          ?? 0
  const evidence         = detected?.evidence            || profile.evidence            || []
  const allCandidates    = detected?.all_candidates      || []
  const languageSummary  = detected?.language_summary    || profile.language_summary    || {}
  const gitInfo          = detected?.git                 || profile.git                 || {}
  const instructionFiles = detected?.instruction_files   || profile.instruction_files   || []
  const detectionMethod  = detected?.detection_method    || profile.detection_method    || 'none'

  // ── Local ─────────────────────────────────────────────────────────────────────
  console.log(chalk.bold('  Local\n'))
  console.log('  ' + chalk.dim('Project      : ') + chalk.white(project_name || '—'))
  console.log('  ' + chalk.dim('ID           : ') + chalk.white(project_id.slice(0, 8) + '...'))
  console.log('  ' + chalk.dim('Backend      : ') + chalk.white(backend_url))
  console.log('  ' + chalk.dim('Last Synced  : ') + chalk.white(timeAgo(last_synced)))

  // ── Project Detection ─────────────────────────────────────────────────────────
  console.log()
  console.log(chalk.bold('  Project Detection\n'))

  const cc = confidenceColor(confidence)
  console.log(
    '  ' + chalk.dim('Type         : ') +
    chalk.cyan(typeLabel) +
    '  ' + cc(`[${confidence}% — ${detectionMethod}]`)
  )

  // Evidence list
  if (evidence.length > 0) {
    console.log('  ' + chalk.dim('Evidence     :'))
    evidence.slice(0, 5).forEach(e => {
      console.log('    ' + chalk.dim('• ') + chalk.dim(e))
    })
  }

  // Other candidates
  if (allCandidates.length > 1) {
    const others = allCandidates.slice(1)
      .map(c => `${c.label} (${c.confidence}%)`)
      .join(', ')
    console.log('  ' + chalk.dim('Also seen    : ') + chalk.dim(others))
  }

  // Language breakdown
  const langEntries = Object.entries(languageSummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  if (langEntries.length > 0) {
    const langStr = langEntries.map(([l, n]) => `${l}(${n})`).join(', ')
    console.log('  ' + chalk.dim('Languages    : ') + chalk.dim(langStr))
  }

  // Git
  if (gitInfo.git_not_installed) {
    console.log('  ' + chalk.dim('Git          : ') + chalk.dim('not installed'))
  } else if (gitInfo.is_git_repo) {
    console.log('  ' + chalk.dim('Git Branch   : ') + chalk.white(gitInfo.branch || '—'))
    if (gitInfo.remote_url) {
      console.log('  ' + chalk.dim('Remote       : ') + chalk.dim(gitInfo.remote_url))
    }
    const dirtyStr = gitInfo.has_uncommitted
      ? chalk.yellow('uncommitted changes')
      : chalk.green('clean')
    console.log('  ' + chalk.dim('Working Dir  : ') + dirtyStr)
    if (gitInfo.last_commit) {
      console.log('  ' + chalk.dim('Last Commit  : ') + chalk.dim(gitInfo.last_commit))
    }
  } else {
    console.log('  ' + chalk.dim('Git          : ') + chalk.dim('not a git repository'))
  }

  // Instruction files
  if (instructionFiles.length > 0) {
    console.log('  ' + chalk.dim('Agent Files  : ') + chalk.green(instructionFiles.join(', ')))
  } else {
    console.log('  ' + chalk.dim('Agent Files  : ') + chalk.dim('none (CLAUDE.md, AGENTS.md, README.md)'))
  }

  // ── Local .contextbridge/ files ───────────────────────────────────────────────
  console.log()
  console.log(chalk.bold('  Local Files (.contextbridge/)\n'))

  const expectedFiles = [
    ['config.json',           'Local config (gitignored)'],
    ['project.json',          'Project metadata'],
    ['project-profile.json',  'Detection profile'],
    ['memory.md',             'Project memory (Markdown)'],
    ['context.json',          'Project memory (JSON)'],
    ['handoff.md',            'Agent handoff prompt'],
    ['AGENT-INSTRUCTIONS.md', 'Instructions for AI agents'],
  ]

  expectedFiles.forEach(([file, desc]) => {
    const exists = fileExists(file)
    const stat   = exists ? getFileStat(file) : null
    const age    = stat   ? chalk.dim(timeAgo(stat.mtime)) : ''
    console.log(
      '  ' + (exists ? chalk.green('✓') : chalk.red('✗')) +
      ' ' + chalk.cyan(file.padEnd(28)) +
      (exists ? age : chalk.red('missing — run ctxbridge sync'))
    )
  })

  // ── Backend ───────────────────────────────────────────────────────────────────
  console.log()
  console.log(chalk.bold('  Backend\n'))

  const spinner = ora('  Connecting...').start()
  try {
    await pingBackend(backend_url)
    spinner.succeed(chalk.green('  Backend reachable'))
  } catch {
    spinner.fail(chalk.red('  Backend not reachable'))
    console.log(chalk.dim('\n  Run: uvicorn app.main:app --reload --port 8000\n'))
    return
  }

  try {
    const [project, memRecord, completeness, sessions, versions] = await Promise.all([
      fetchProject(backend_url, project_id),
      fetchMemory(backend_url, project_id),
      fetchCompleteness(backend_url, project_id),
      fetchSessions(backend_url, project_id),
      fetchVersions(backend_url, project_id)
    ])

    const memory  = memRecord.memory_data || {}
    const version = memRecord.version

    console.log()
    console.log(chalk.bold('  Project\n'))
    console.log('  ' + chalk.dim('Name         : ') + chalk.white(project.name))
    console.log('  ' + chalk.dim('Memory v     : ') + chalk.white(`v${version}`))
    console.log('  ' + chalk.dim('Sessions     : ') + chalk.white(sessions.length))
    console.log('  ' + chalk.dim('Versions     : ') + chalk.white(versions.length))

    console.log()
    console.log(chalk.bold('  Memory Completeness\n'))
    console.log('  ' + scoreBar(completeness.score))
    console.log()

    const fields = [
      ['project_overview',   'Project Overview'],
      ['requirements',       'Requirements'],
      ['architecture',       'Architecture'],
      ['technologies',       'Technologies'],
      ['current_progress',   'Current Progress'],
      ['key_decisions',      'Key Decisions'],
      ['pending_tasks',      'Pending Tasks'],
      ['known_issues',       'Known Issues'],
      ['agent_instructions', 'Agent Instructions'],
    ]

    fields.forEach(([key, label]) => {
      const val   = memory[key]
      const ok    = Array.isArray(val) ? val.length > 0 : Boolean(val)
      const count = Array.isArray(val) && val.length > 0 ? chalk.dim(` (${val.length})`) : ''
      console.log(
        '  ' + (ok ? chalk.green('✓') : chalk.red('○')) +
        ' ' + label.padEnd(22) +
        (ok ? count : chalk.red(' empty'))
      )
    })

    if (completeness.warnings?.length > 0) {
      console.log()
      console.log(chalk.bold('  Warnings\n'))
      completeness.warnings.forEach(w => {
        console.log('  ' + chalk.yellow('⚠') + ' ' + chalk.yellow(w))
      })
    }

    if (memory.pending_tasks?.length > 0) {
      console.log()
      console.log(chalk.bold('  Pending Tasks\n'))
      memory.pending_tasks.forEach(t => {
        console.log('  ' + chalk.yellow('☐') + ' ' + t)
      })
    }

    console.log()
    if (completeness.ready_for_handoff) {
      console.log('  ' + chalk.bold.green('✓ Ready for agent handoff'))
    } else {
      console.log('  ' + chalk.bold.yellow('⚠ Not ready for handoff'))
      if (completeness.missing?.length > 0) {
        console.log(chalk.dim('    Missing: ') + completeness.missing.join(', '))
      }
    }

    if (last_synced) {
      const diffMs = Date.now() - new Date(last_synced).getTime()
      if (diffMs > 3600000) {
        console.log()
        console.log(
          chalk.dim('  Last synced ' + timeAgo(last_synced) + '.') +
          chalk.cyan(' Run ctxbridge sync to update.')
        )
      }
    }

    console.log()

  } catch (err) {
    console.error(chalk.red('\n  ✗ Failed to fetch status: ') + err.message)
    process.exit(1)
  }
}

module.exports = { status }