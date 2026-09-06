const chalk = require('chalk')

const STARTUP_HINT =
  chalk.dim('  Is the backend running?\n') +
  chalk.dim('  uvicorn app.main:app --reload --port 8000')

const STATUS_MESSAGES = {
  400: 'The backend rejected the request (bad request).',
  404: 'The requested resource was not found on the backend.',
  422: 'The backend could not validate the request payload.',
  500: 'The backend hit an internal error while handling the request.'
}

/**
 * Turn an axios/network error into a clear, actionable message for the
 * terminal. Covers: connection refused, DNS/host errors, timeouts,
 * non-2xx HTTP responses (400/404/422/500 and others), and invalid/
 * non-JSON responses.
 */
function formatRequestError(err, backendUrl) {
  const lines = []

  // No response at all — connection-level failure
  if (!err.response) {
    if (err.code === 'ECONNREFUSED') {
      lines.push(chalk.red(`  ✗ Unable to connect to the ContextBridge backend at ${backendUrl}`))
      lines.push(STARTUP_HINT)
      return lines.join('\n')
    }
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      lines.push(chalk.red(`  ✗ Request to the backend timed out (${backendUrl})`))
      lines.push(chalk.dim('  The backend may be slow to respond or unreachable.'))
      return lines.join('\n')
    }
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      lines.push(chalk.red(`  ✗ Could not resolve backend host: ${backendUrl}`))
      lines.push(chalk.dim('  Check CONTEXTBRIDGE_API_URL or your --backend value.'))
      return lines.join('\n')
    }
    // Invalid JSON / malformed response, or anything else axios couldn't classify
    lines.push(chalk.red(`  ✗ ${err.message || 'Unexpected error while contacting the backend.'}`))
    return lines.join('\n')
  }

  // Got an HTTP response, but a non-2xx status
  const { status, data } = err.response
  const known = STATUS_MESSAGES[status]
  lines.push(chalk.red(`  ✗ Backend responded with HTTP ${status}${known ? ' — ' + known : ''}`))

  const detail = data?.detail || data?.message
  if (detail) {
    lines.push(chalk.dim(`    ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`))
  }

  return lines.join('\n')
}

module.exports = { formatRequestError, STARTUP_HINT }