const chalk = require('chalk')
const ora   = require('ora')
const { requireLocalConfig } = require('../lib/config')
const { fetchProject, fetchMemory, fetchCompleteness, fetchSessions, fetchVersions, pingBackend } = require('../lib/api')
const { fileExists, getFileStat, listFiles } = require('../lib/files')

function timeAgo(dateStr) {
  if (!dateStr) return 'never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)   return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  return `${days}d ago`
}

function scoreBar(score) {
  const filled = Math.round(score / 10)
  const empty  = 10 - filled
  const color  = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty)) + ' ' + color(`${score}%`)
}

async function status(options) {
  console.log(chalk.bold.blue('\n  ContextBridge Status\n'))

  const config = requireLocalConfig()
  const { project_id, backend_url, project_name, last_synced } = config

  // Section 1 — Local info (no network needed)
  console.log(chalk.bold('  Local\n'))
  console.log('  ' + chalk.dim('Project  : ') + chalk.white(project_name || '—'))
  console.log('  ' + chalk.dim('ID       : ') + chalk.white(project_id.slice(0, 8) + '...'))
  console.log('  ' + chalk.dim('Backend  : ') + chalk.white(backend_url))
  console.log('  ' + chalk.dim('Synced   : ') + chalk.white(timeAgo(last_synced)))

  // Local files
  console.log()
  console.log(chalk.bold('  Local Files\n'))
  const expectedFiles = ['config.json', 'project.json', 'memory.md', 'context.json', 'handoff.md', 'AGENT-INSTRUCTIONS.md']
  expectedFiles.forEach(file => {
    const exists = fileExists(file)
    const stat   = exists ? getFileStat(file) : null
    const age    = stat ? timeAgo(stat.mtime) : ''
    console.log(
      '  ' + (exists ? chalk.green('✓') : chalk.red('✗')) +
      ' ' + chalk.cyan(file.padEnd(26)) +
      (exists ? chalk.dim(age) : chalk.red('missing'))
    )
  })

  // Section 2 — Backend (requires network)
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

    // Project info
    console.log()
    console.log(chalk.bold('  Project\n'))
    console.log('  ' + chalk.dim('Name     : ') + chalk.white(project.name))
    console.log('  ' + chalk.dim('Memory v : ') + chalk.white(`v${version}`))
    console.log('  ' + chalk.dim('Sessions : ') + chalk.white(sessions.length))
    console.log('  ' + chalk.dim('Versions : ') + chalk.white(versions.length))

    // Completeness
    console.log()
    console.log(chalk.bold('  Memory Completeness\n'))
    console.log('  ' + scoreBar(completeness.score))
    console.log()

    // Field-by-field breakdown
    const fields = [
      ['project_overview',  'Project Overview'],
      ['requirements',      'Requirements'],
      ['architecture',      'Architecture'],
      ['technologies',      'Technologies'],
      ['current_progress',  'Current Progress'],
      ['key_decisions',     'Key Decisions'],
      ['pending_tasks',     'Pending Tasks'],
      ['known_issues',      'Known Issues'],
      ['agent_instructions','Agent Instructions'],
    ]

    fields.forEach(([key, label]) => {
      const val   = memory[key]
      const ok    = Array.isArray(val) ? val.length > 0 : Boolean(val)
      const count = Array.isArray(val) ? `(${val.length} items)` : ''
      console.log(
        '  ' + (ok ? chalk.green('✓') : chalk.red('○')) +
        ' ' + label.padEnd(22) +
        (ok ? chalk.dim(count) : chalk.red('empty'))
      )
    })

    // Warnings
    if (completeness.warnings?.length > 0) {
      console.log()
      console.log(chalk.bold('  Warnings\n'))
      completeness.warnings.forEach(w => {
        console.log('  ' + chalk.yellow('⚠') + ' ' + chalk.yellow(w))
      })
    }

    // Pending tasks
    if (memory.pending_tasks?.length > 0) {
      console.log()
      console.log(chalk.bold('  Pending Tasks\n'))
      memory.pending_tasks.forEach(t => {
        console.log('  ' + chalk.yellow('☐') + ' ' + t)
      })
    }

    // Handoff readiness
    console.log()
    if (completeness.ready_for_handoff) {
      console.log('  ' + chalk.bold.green('✓ Ready for agent handoff'))
    } else {
      console.log('  ' + chalk.bold.yellow('⚠ Not ready for handoff'))
      if (completeness.missing?.length > 0) {
        console.log(chalk.dim('    Missing: ') + completeness.missing.join(', '))
      }
    }

    // Sync suggestion
    if (last_synced) {
      const diffMs = Date.now() - new Date(last_synced).getTime()
      if (diffMs > 3600000) {
        console.log()
        console.log(chalk.dim('  Last synced ' + timeAgo(last_synced) + '.') + chalk.cyan(' Run contextbridge sync to update local files.'))
      }
    }

    console.log()

  } catch (err) {
    console.error(chalk.red('\n  ✗ Failed to fetch status: ') + err.message)
    process.exit(1)
  }
}

module.exports = { status }