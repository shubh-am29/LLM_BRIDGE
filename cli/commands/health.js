'use strict'

const chalk = require('chalk')
const ora   = require('ora')
const { getBackendUrl } = require('../lib/config')
const { pingBackend }   = require('../lib/api')
const { formatRequestError } = require('../lib/errors')

async function health(options) {
  const backendUrl = getBackendUrl()

  const spinner = ora(`Connecting to ${backendUrl}...`).start()

  try {
    const result = await pingBackend(backendUrl)
    spinner.stop()

    console.log(chalk.green('  ✓ ContextBridge backend is connected'))
    console.log(chalk.dim('  Backend : ') + chalk.white(backendUrl))
    console.log(chalk.dim('  Status  : ') + chalk.white(result?.status || 'ok'))
  } catch (err) {
    spinner.stop()
    console.log(formatRequestError(err, backendUrl))
    process.exit(1)
  }
}

module.exports = { health }