const chalk = require('chalk')
const ora   = require('ora')
const path  = require('path')
const fs    = require('fs')
const { requireLocalConfig, getBackendUrl } = require('../lib/config')
const { fetchExportPackage, fetchHandoffPrompt } = require('../lib/api')
const { writeFile } = require('../lib/files')
const { formatRequestError } = require('../lib/errors')

async function exportContext(options) {
  console.log(chalk.bold.blue('\n  ContextBridge Export\n'))

  const config      = requireLocalConfig()
  const { project_id } = config
  const backend_url = getBackendUrl()

  const spinner = ora('Fetching latest memory from backend...').start()

  try {
    const [exportPkg, handoff] = await Promise.all([
      fetchExportPackage(backend_url, project_id),
      fetchHandoffPrompt(backend_url, project_id)
    ])

    spinner.text = 'Writing export files...'

    // Core export files
    writeFile('memory.md',              exportPkg.project_memory_md)
    writeFile('context.json',           exportPkg.project_memory_json)
    writeFile('AGENT-INSTRUCTIONS.md',  exportPkg.agent_instructions_md || '')
    writeFile('handoff.md',             handoff.prompt)

    // Also write project-config.json for the full package
    writeFile('project-config.json',    exportPkg.project_config_json)

    // Optionally export to project root if --root flag passed
    if (options.root) {
      const rootDir = process.cwd()
      fs.writeFileSync(
        path.join(rootDir, 'AGENT-CONTEXT.md'),
        exportPkg.project_memory_md,
        'utf8'
      )
      console.log()
      spinner.succeed(chalk.green('Export complete'))
      console.log('  ' + chalk.green('✓') + ' ' + chalk.cyan('AGENT-CONTEXT.md') + chalk.dim(' written to project root'))
    } else {
      spinner.succeed(chalk.green('Export complete'))
    }

    // Report
    console.log()
    const version = exportPkg.project_config_json?.export_version || '?'
    console.log(chalk.dim('  Memory version : ') + chalk.white(`v${version}`))
    console.log(chalk.dim('  Project        : ') + chalk.white(exportPkg.project_config_json?.project_name || config.project_name))
    console.log()
    console.log(chalk.bold('  Exported to .contextbridge/:\n'))

    const files = [
      ['memory.md',              'Paste this into any AI agent session'],
      ['context.json',           'Structured memory for tools'],
      ['handoff.md',             'Full agent handoff prompt'],
      ['AGENT-INSTRUCTIONS.md',  'How agents should use this context'],
      ['project-config.json',    'Project metadata'],
    ]

    files.forEach(([file, desc]) => {
      console.log('  ' + chalk.green('✓') + ' ' + chalk.cyan(file.padEnd(26)) + chalk.dim(desc))
    })

    console.log()
    console.log(chalk.bold('  How to use:\n'))
    console.log('  1. ' + chalk.white('Open .contextbridge/memory.md'))
    console.log('  2. ' + chalk.white('Copy the contents'))
    console.log('  3. ' + chalk.white('Paste at the start of your agent session'))
    console.log('  4. ' + chalk.white('The agent now has full project context\n'))

    // Token count
    if (handoff.token_count) {
      const tokens = handoff.token_count
      const color  = tokens > 6000 ? chalk.red : tokens > 3000 ? chalk.yellow : chalk.green
      console.log('  ' + chalk.dim('Context size: ') + color(`${tokens.toLocaleString()} tokens`))
      if (tokens > 6000) {
        console.log(chalk.dim('  Tip: Use contextbridge export --task "your task" for a smaller context'))
      }
      console.log()
    }

  } catch (err) {
    spinner.fail(chalk.red('Export failed'))
    console.error(formatRequestError(err, backend_url))
    process.exit(1)
  }
}

module.exports = { exportContext }