const chalk  = require('chalk')
const ora    = require('ora')
const readline = require('readline')
const { writeLocalConfig, getBackendUrl, ensureGitignore, DEFAULT_BACKEND } = require('../lib/config')
const { fetchProjects, pingBackend } = require('../lib/api')
const { writeFile } = require('../lib/files')

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

async function init(options) {
  console.log(chalk.bold.blue('\n  ContextBridge Init\n'))

  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout
  })

  try {
    // Step 1 — backend URL
    const backendUrl =  options.backend || (
      await prompt(rl, chalk.cyan(`Backend URL [${DEFAULT_BACKEND}]: `))
    ).trim() || DEFAULT_BACKEND

    // Step 2 — verify backend is reachable
    const spinner = ora('Connecting to ContextBridge backend...').start()
    try {
      await pingBackend(backendUrl)
      spinner.succeed(chalk.green('Backend connected'))
    } catch {
      spinner.fail(chalk.red(`Cannot reach backend at ${backendUrl}`))
      console.log(chalk.dim('  Make sure the backend is running: uvicorn app.main:app --reload --port 8000'))
      rl.close()
      process.exit(1)
    }

    // Step 3 — list projects to pick from
    const projects = await fetchProjects(backendUrl)

    let projectId
    let projectName

    if (projects.length === 0) {
      console.log(chalk.yellow('\n  No projects found. Create one in the ContextBridge UI first.'))
      rl.close()
      process.exit(1)
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
      rl.close()
      process.exit(1)
    }

    projectId   = projects[index].id
    projectName = projects[index].name

    rl.close()

    // Step 4 — write local config
    const config = {
      project_id:   projectId,
      project_name: projectName,
      backend_url:  backendUrl,
      initialized:  new Date().toISOString()
    }

    writeLocalConfig(config)

    // Step 5 — write project.json
    writeFile('project.json', {
      project_id:   projectId,
      project_name: projectName,
      linked_at:    new Date().toISOString()
    })

    // Step 6 — gitignore
    const addedGitignore = ensureGitignore()

    // Done
    console.log(chalk.bold.green('\n  ✓ Project linked successfully!\n'))
    console.log(chalk.dim('  Project : ') + chalk.white(projectName))
    console.log(chalk.dim('  ID      : ') + chalk.white(projectId))
    console.log(chalk.dim('  Backend : ') + chalk.white(backendUrl))
    console.log(chalk.dim('  Config  : ') + chalk.white('.contextbridge/config.json'))
    if (addedGitignore) {
      console.log(chalk.dim('  Added   : ') + chalk.white('.contextbridge/config.json to .gitignore'))
    }

    console.log(chalk.bold.blue('\n  Next steps:\n'))
    console.log('  ' + chalk.cyan('ctxbridge sync')   + '   Pull latest memory')
    console.log('  ' + chalk.cyan('ctxbridge status') + '   Check project health')
    console.log('  ' + chalk.cyan('ctxbridge export') + '   Export context files\n')

  } catch (err) {
    rl.close()
    console.error(chalk.red('\n  ✗ Init failed: ') + err.message)
    process.exit(1)
  }
}

module.exports = { init }