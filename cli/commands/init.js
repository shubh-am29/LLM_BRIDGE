'use strict'

const chalk    = require('chalk')
const ora      = require('ora')
const readline = require('readline')
const { writeLocalConfig, ensureGitignore, DEFAULT_BACKEND } = require('../lib/config')
const { fetchProjects, pingBackend } = require('../lib/api')
const { writeFile } = require('../lib/files')
const { formatRequestError } = require('../lib/errors')
const detector = require('../lib/project-detector')

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

function confidenceColor(n) {
  if (n >= 80) return chalk.green
  if (n >= 50) return chalk.yellow
  return chalk.red
}

function confidenceLabel(n) {
  if (n >= 80) return 'high'
  if (n >= 50) return 'moderate'
  if (n >  0)  return 'low'
  return 'none'
}

function printDetectedInfo(info) {
  console.log(chalk.bold('  Detected Project Info\n'))
  console.log('  ' + chalk.dim('Folder       : ') + chalk.white(info.folder_name))
  console.log('  ' + chalk.dim('Project Name : ') + chalk.white(info.project_name))

  // Type + confidence
  const cc = confidenceColor(info.confidence)
  console.log(
    '  ' + chalk.dim('Type         : ') +
    chalk.cyan(info.project_type_label) +
    '  ' + cc(`[${info.confidence}% confidence — ${confidenceLabel(info.confidence)}]`)
  )

  // Evidence
  if (info.evidence && info.evidence.length > 0) {
    console.log('  ' + chalk.dim('Evidence     :'))
    info.evidence.slice(0, 4).forEach(e => {
      console.log('    ' + chalk.dim('• ') + chalk.dim(e))
    })
  }

  // Other candidates
  if (info.all_candidates && info.all_candidates.length > 1) {
    const others = info.all_candidates.slice(1).map(c =>
      `${c.label} (${c.confidence}%)`
    ).join(', ')
    console.log('  ' + chalk.dim('Also seen    : ') + chalk.dim(others))
  }

  // Language breakdown
  if (info.language_summary && Object.keys(info.language_summary).length > 0) {
    const langs = Object.entries(info.language_summary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([l, n]) => `${l}(${n})`)
      .join(', ')
    console.log('  ' + chalk.dim('Languages    : ') + chalk.dim(langs))
  }

  // Git
  if (info.git.is_git_repo) {
    console.log('  ' + chalk.dim('Git Branch   : ') + chalk.white(info.git.branch || '—'))
    if (info.git.remote_url) {
      console.log('  ' + chalk.dim('Remote       : ') + chalk.white(info.git.remote_url))
    }
    const dirty = info.git.has_uncommitted
      ? chalk.yellow('uncommitted changes')
      : chalk.green('clean')
    console.log('  ' + chalk.dim('Working Dir  : ') + dirty)
  } else if (info.git.git_not_installed) {
    console.log('  ' + chalk.dim('Git          : ') + chalk.dim('not installed'))
  } else {
    console.log('  ' + chalk.dim('Git          : ') + chalk.dim('not a git repository'))
  }

  if (info.readme_summary) {
    const s = info.readme_summary.length > 80
      ? info.readme_summary.slice(0, 80) + '…'
      : info.readme_summary
    console.log('  ' + chalk.dim('README       : ') + chalk.dim(s))
  }

  if (info.instruction_files && info.instruction_files.length > 0) {
    console.log('  ' + chalk.dim('Agent Files  : ') + chalk.green(info.instruction_files.join(', ')))
  }

  console.log()
}

async function init(options) {
  console.log(chalk.bold.blue('\n  ContextBridge Init\n'))

  const spinner = ora('Detecting project...').start()
  let detected
  try {
    detected = detector.detect(process.cwd())
    spinner.succeed(chalk.green('Project detected'))
  } catch {
    spinner.warn(chalk.yellow('Detection failed — continuing with defaults'))
    detected = {
      folder_name: require('path').basename(process.cwd()),
      project_name: require('path').basename(process.cwd()),
      project_type: 'unknown',
      project_type_label: 'Unknown',
      confidence: 0,
      detection_method: 'none',
      evidence: [],
      all_candidates: [],
      language_summary: {},
      git: {},
      files: {},
      instruction_files: [],
      readme_summary: null,
      detected_at: new Date().toISOString()
    }
  }

  console.log()
  printDetectedInfo(detected)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  try {
    const confirmedName = (
      await prompt(rl, chalk.cyan(`  Project name [${detected.project_name}]: `))
    ).trim() || detected.project_name

    const backendUrl = (
      await prompt(rl, chalk.cyan(`  Backend URL [${DEFAULT_BACKEND}]: `))
    ).trim() || DEFAULT_BACKEND

    const connectSpinner = ora('  Connecting to ContextBridge backend...').start()
    try {
      await pingBackend(backendUrl)
      connectSpinner.succeed(chalk.green('  Backend connected'))
    } catch {
      connectSpinner.fail(chalk.red(`  Cannot reach backend at ${backendUrl}`))
      console.log(chalk.dim('\n  uvicorn app.main:app --reload --port 8000\n'))
      rl.close(); process.exit(1)
    }

    const projects = await fetchProjects(backendUrl)
    if (projects.length === 0) {
      console.log(chalk.yellow('\n  No projects found. Create one in the ContextBridge UI first.'))
      rl.close(); process.exit(1)
    }

    console.log(chalk.bold('\n  Available Projects:\n'))
    projects.forEach((p, i) => {
      console.log(chalk.dim(`  [${i + 1}]`) + ` ${p.name}` + chalk.dim(` (${p.id.slice(0, 8)}...)`))
    })
    console.log()

    const choice = (await prompt(rl, chalk.cyan('  Select project number: '))).trim()
    const index  = parseInt(choice, 10) - 1
    if (isNaN(index) || index < 0 || index >= projects.length) {
      console.log(chalk.red('  Invalid selection.'))
      rl.close(); process.exit(1)
    }

    const selectedProject = projects[index]
    rl.close()

    writeLocalConfig({
      project_id:   selectedProject.id,
      project_name: selectedProject.name,
      backend_url:  backendUrl,
      initialized:  new Date().toISOString(),
      last_synced:  null
    })

    writeFile('project-profile.json', {
      local_name:          confirmedName,
      folder_name:         detected.folder_name,
      project_type:        detected.project_type,
      project_type_label:  detected.project_type_label,
      confidence:          detected.confidence,
      detection_method:    detected.detection_method,
      evidence:            detected.evidence,
      language_summary:    detected.language_summary,
      git: {
        is_git_repo:      detected.git.is_git_repo      || false,
        branch:           detected.git.branch            || null,
        remote_url:       detected.git.remote_url        || null,
        has_uncommitted:  detected.git.has_uncommitted   || false
      },
      instruction_files:   detected.instruction_files,
      readme_summary:      detected.readme_summary,
      detected_at:         detected.detected_at
    })

    writeFile('project.json', {
      project_id:   selectedProject.id,
      project_name: selectedProject.name,
      local_name:   confirmedName,
      linked_at:    new Date().toISOString()
    })

    const addedGitignore = ensureGitignore()

    console.log(chalk.bold.green('\n  ✓ Project linked successfully!\n'))
    console.log(chalk.dim('  Project     : ') + chalk.white(selectedProject.name))
    console.log(chalk.dim('  Local name  : ') + chalk.white(confirmedName))
    console.log(
      chalk.dim('  Type        : ') +
      chalk.cyan(detected.project_type_label) +
      chalk.dim(` (${detected.confidence}% confidence)`)
    )
    console.log(chalk.dim('  ID          : ') + chalk.white(selectedProject.id))
    console.log(chalk.dim('  Backend     : ') + chalk.white(backendUrl))
    if (addedGitignore) {
      console.log(chalk.dim('  Gitignore   : ') + chalk.white('.contextbridge/config.json added'))
    }
    console.log(chalk.bold.blue('\n  Next steps:\n'))
    console.log('  ' + chalk.cyan('ctxbridge sync')   + '    Pull latest memory')
    console.log('  ' + chalk.cyan('ctxbridge status') + '    Check project health')
    console.log('  ' + chalk.cyan('ctxbridge export') + '    Export context files\n')

  } catch (err) {
    rl.close()
    console.error(chalk.red('\n  ✗ Init failed: ') + err.message)
    process.exit(1)
  }
}

module.exports = { init }