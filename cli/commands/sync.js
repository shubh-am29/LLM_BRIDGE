const chalk = require('chalk')
const ora   = require('ora')
const { requireLocalConfig } = require('../lib/config')
const { fetchProject, fetchMemory, fetchHandoffPrompt, fetchExportPackage } = require('../lib/api')
const { writeFile } = require('../lib/files')

async function sync(options) {
  console.log(chalk.bold.blue('\n  ContextBridge Sync\n'))

  const config     = requireLocalConfig()
  const { project_id, backend_url, project_name } = config

  const spinner = ora('Connecting to backend...').start()

  try {
    // Fetch everything in parallel
    spinner.text = 'Fetching project memory...'
    const [project, memRecord, handoff, exportPkg] = await Promise.all([
      fetchProject(backend_url, project_id),
      fetchMemory(backend_url, project_id),
      fetchHandoffPrompt(backend_url, project_id),
      fetchExportPackage(backend_url, project_id)
    ])

    spinner.text = 'Writing local files...'

    const memory   = memRecord.memory_data || {}
    const version  = memRecord.version     || 1

    // Write all files
    writeFile('memory.md',              exportPkg.project_memory_md)
    writeFile('context.json',           exportPkg.project_memory_json)
    writeFile('config.json',            {
      ...config,
      last_synced:    new Date().toISOString(),
      memory_version: version
    })
    writeFile('project.json', {
      project_id:     project.id,
      project_name:   project.name,
      description:    project.description || '',
      memory_version: version,
      last_synced:    new Date().toISOString()
    })
    writeFile('handoff.md',             handoff.prompt)
    writeFile('AGENT-INSTRUCTIONS.md',  exportPkg.agent_instructions_md || '')

    spinner.succeed(chalk.green('Sync complete'))

    // Summary
    const filled = Object.entries(memory).filter(([, v]) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v)
    ).length
    const total = Object.keys(memory).length

    console.log()
    console.log(chalk.dim('  Project       : ') + chalk.white(project.name))
    console.log(chalk.dim('  Memory v      : ') + chalk.white(version))
    console.log(chalk.dim('  Completeness  : ') + chalk.white(`${filled}/${total} sections filled`))
    console.log(chalk.dim('  Synced at     : ') + chalk.white(new Date().toLocaleString()))
    console.log()
    console.log(chalk.bold('  Files written to .contextbridge/:\n'))

    const files = [
      ['memory.md',             'Project memory (Markdown)'],
      ['context.json',          'Project memory (JSON)'],
      ['handoff.md',            'Agent handoff prompt'],
      ['AGENT-INSTRUCTIONS.md', 'Instructions for AI agents'],
      ['project.json',          'Project metadata'],
      ['config.json',           'Local config'],
    ]

    files.forEach(([file, desc]) => {
      console.log('  ' + chalk.green('✓') + ' ' + chalk.cyan(file.padEnd(26)) + chalk.dim(desc))
    })

    console.log()

    if (memory.pending_tasks && memory.pending_tasks.length > 0) {
      console.log(chalk.bold('  Pending Tasks:\n'))
      memory.pending_tasks.forEach(t => {
        console.log('  ' + chalk.yellow('☐') + ' ' + t)
      })
      console.log()
    }

    if (handoff.completeness && !handoff.completeness.ready_for_handoff) {
      console.log(chalk.yellow('  ⚠ Memory is not complete yet.'))
      if (handoff.completeness.missing?.length > 0) {
        console.log(chalk.dim('    Missing: ') + handoff.completeness.missing.join(', '))
      }
      console.log()
    }

  } catch (err) {
    spinner.fail(chalk.red('Sync failed'))
    console.error(chalk.dim('  Error: ') + err.message)
    if (err.code === 'ECONNREFUSED') {
      console.log(chalk.dim('\n  Is the backend running?'))
      console.log(chalk.dim('  uvicorn app.main:app --reload --port 8000\n'))
    }
    process.exit(1)
  }
}

module.exports = { sync }