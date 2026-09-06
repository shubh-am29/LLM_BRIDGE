'use strict'

const chalk = require('chalk')
const ora   = require('ora')
const path  = require('path')
const { requireLocalConfig } = require('../lib/config')
const {
  fetchProject, fetchMemory, fetchHandoffPrompt,
  fetchExportPackage, ingestProject
} = require('../lib/api')
const { writeFile, readFile } = require('../lib/files')
const { scanProjectFiles }    = require('../lib/scanner')
const { analyseProject }      = require('../lib/analyser')
const detector = require('../lib/project-detector')

async function sync(options) {
  console.log(chalk.bold.blue('\n  ContextBridge Sync\n'))

  const config = requireLocalConfig()
  const { project_id, backend_url } = config

  // ── Step 1: Re-detect local project ─────────────────────────────────────────
  let profile = readFile('project-profile.json') || {}
  try {
    const detected = detector.detect(process.cwd())
    profile = {
      ...profile,
      project_type:       detected.project_type,
      project_type_label: detected.project_type_label,
      git: {
        is_git_repo:      detected.git.is_git_repo     || false,
        branch:           detected.git.branch           || null,
        remote_url:       detected.git.remote_url       || null,
        has_uncommitted:  detected.git.has_uncommitted  || false,
        last_commit:      detected.git.last_commit      || null,
      },
      instruction_files: detected.instruction_files,
      readme_summary:    detected.readme_summary,
      last_synced:       new Date().toISOString(),
    }
  } catch {
    // Non-fatal — continue with cached profile
  }

  // ── Step 2: Scan project files ───────────────────────────────────────────────
  const scanSpinner = ora('  Scanning project files...').start()
  let scanResult = { files: [], skipped: [], stats: { totalFound: 0, included: 0 } }

  try {
    scanResult = scanProjectFiles(process.cwd())
    scanSpinner.succeed(
      chalk.green(`  Found ${scanResult.stats.included} source files`) +
      chalk.dim(` (${scanResult.stats.skippedCount} skipped)`)
    )
  } catch (err) {
    scanSpinner.warn(chalk.yellow(`  File scan failed: ${err.message} — continuing without ingestion`))
  }

  // ── Step 3: Analyse project ──────────────────────────────────────────────────
  let detectedMemory = {}
  if (scanResult.files.length > 0) {
    const analyseSpinner = ora('  Analysing project structure...').start()
    try {
      detectedMemory = analyseProject(scanResult.files)
      analyseSpinner.succeed(chalk.green('  Analysis complete'))
    } catch (err) {
      analyseSpinner.warn(chalk.yellow(`  Analysis failed: ${err.message}`))
    }
  } else {
    console.log(chalk.dim('  No source files found — skipping project analysis'))
  }

  // ── Step 4: Send to backend (ingest) ─────────────────────────────────────────
  const ingestSpinner = ora('  Updating project memory...').start()
  let ingestResult = null

  if (Object.keys(detectedMemory).length > 0) {
    try {
      ingestResult = await ingestProject(backend_url, project_id, detectedMemory, {
        file_count:    scanResult.stats.included,
        total_found:   scanResult.stats.totalFound,
        languages:     detectedMemory.technologies || [],
        scanned_at:    new Date().toISOString(),
      })
      ingestSpinner.succeed(chalk.green('  Project memory updated'))
    } catch (err) {
      ingestSpinner.warn(
        chalk.yellow('  Memory ingestion failed: ') + chalk.dim(err.message)
      )
    }
  } else {
    ingestSpinner.info(chalk.dim('  Skipping memory ingestion (no data to send)'))
  }

  // ── Step 5: Pull latest from backend ─────────────────────────────────────────
  const fetchSpinner = ora('  Fetching latest memory from backend...').start()

  try {
    const [project, memRecord, handoff, exportPkg] = await Promise.all([
      fetchProject(backend_url, project_id),
      fetchMemory(backend_url, project_id),
      fetchHandoffPrompt(backend_url, project_id),
      fetchExportPackage(backend_url, project_id)
    ])

    fetchSpinner.succeed(chalk.green('  Memory retrieved'))

    const memory  = memRecord.memory_data || {}
    const version = memRecord.version     || 1

    // ── Step 6: Write local files ───────────────────────────────────────────────
    const writeSpinner = ora('  Writing local memory files...').start()

    // Enhance context.json with local profile
    const enhancedContext = {
      ...exportPkg.project_memory_json,
      _local_profile: {
        project_type:       profile.project_type       || 'unknown',
        project_type_label: profile.project_type_label || 'Unknown',
        git_branch:         profile.git?.branch         || null,
        instruction_files:  profile.instruction_files   || [],
        file_count:         scanResult.stats.included,
        last_scan:          new Date().toISOString(),
      }
    }

    writeFile('memory.md',              exportPkg.project_memory_md)
    writeFile('context.json',           enhancedContext)
    writeFile('handoff.md',             handoff.prompt)
    writeFile('AGENT-INSTRUCTIONS.md',  exportPkg.agent_instructions_md || '')
    writeFile('project-profile.json',   profile)
    writeFile('project.json', {
      project_id:     project.id,
      project_name:   project.name,
      local_name:     profile.local_name || project.name,
      project_type:   profile.project_type || 'unknown',
      memory_version: version,
      last_synced:    new Date().toISOString(),
      file_count:     scanResult.stats.included,
    })
    writeFile('config.json', {
      ...config,
      last_synced:    new Date().toISOString(),
      memory_version: version,
    })

    writeSpinner.succeed(chalk.green('  Local files written'))

    // ── Step 7: Summary ─────────────────────────────────────────────────────────
    console.log()
    console.log(chalk.bold.green('  ✓ Project memory synchronized successfully\n'))

    console.log(chalk.dim('  Project      : ') + chalk.white(project.name))
    console.log(chalk.dim('  Type         : ') + chalk.cyan(profile.project_type_label || 'Unknown'))
    console.log(chalk.dim('  Memory v     : ') + chalk.white(`v${version}`))
    console.log(chalk.dim('  Files scanned: ') + chalk.white(scanResult.stats.included))

    if (profile.git?.is_git_repo) {
      const dirty = profile.git.has_uncommitted
        ? chalk.yellow(' (uncommitted changes)')
        : ''
      console.log(chalk.dim('  Git branch   : ') + chalk.white(profile.git.branch || '—') + dirty)
    }

    console.log(chalk.dim('  Synced at    : ') + chalk.white(new Date().toLocaleString()))

    // Technologies detected
    const techs = (memory.technologies || []).slice(0, 6)
    if (techs.length > 0) {
      console.log()
      console.log(chalk.bold('  Technologies detected:\n'))
      techs.forEach(t => console.log('  ' + chalk.cyan('→') + ' ' + t))
    }

    // Important files
    const important = (memory.important_code || []).slice(0, 6)
    if (important.length > 0) {
      console.log()
      console.log(chalk.bold('  Key files:\n'))
      important.forEach(f => console.log('  ' + chalk.dim('•') + ' ' + f))
    }

    // Pending tasks
    const pending = (memory.pending_tasks || []).slice(0, 5)
    if (pending.length > 0) {
      console.log()
      console.log(chalk.bold('  Pending tasks:\n'))
      pending.forEach(t => console.log('  ' + chalk.yellow('☐') + ' ' + t))
    }

    // Written files summary
    console.log()
    console.log(chalk.bold('  Files written to .contextbridge/:\n'))
    const writtenFiles = [
      ['memory.md',              'Project memory (Markdown)'],
      ['context.json',           'Memory + local profile (JSON)'],
      ['handoff.md',             'Agent handoff prompt'],
      ['AGENT-INSTRUCTIONS.md',  'Instructions for AI agents'],
      ['project-profile.json',   'Local detection profile'],
      ['project.json',           'Project metadata'],
      ['config.json',            'Local config'],
    ]
    writtenFiles.forEach(([file, desc]) => {
      console.log(
        '  ' + chalk.green('✓') +
        ' ' + chalk.cyan(file.padEnd(26)) +
        chalk.dim(desc)
      )
    })

    // Memory completeness hint
    const emptyFields = Object.entries(memory)
      .filter(([k, v]) => {
        if (k.startsWith('_')) return false
        return Array.isArray(v) ? v.length === 0 : !v
      })
      .map(([k]) => k)

    if (emptyFields.length > 0) {
      console.log()
      console.log(chalk.yellow('  ⚠ Some memory fields are still empty:'))
      console.log(chalk.dim('    ' + emptyFields.join(', ')))
      console.log(chalk.dim('    Fill these in the ContextBridge UI or CLAUDE.md'))
    }

    console.log()

  } catch (err) {
    fetchSpinner.fail(chalk.red('  Failed to fetch from backend'))
    console.error(chalk.dim('  Error: ') + err.message)

    if (err.code === 'ECONNREFUSED') {
      console.log(chalk.dim('\n  Is the backend running?'))
      console.log(chalk.dim('  uvicorn app.main:app --reload --port 8000\n'))
    }

    process.exit(1)
  }
}

module.exports = { sync }