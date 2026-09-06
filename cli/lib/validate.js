'use strict'

/**
 * Basic input validation used across CLI commands.
 * Keeps commands from making network calls with obviously-bad input,
 * and gives a clear message instead of a confusing axios/network error.
 */

function isValidBackendUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates a backend URL string. Returns { valid, message }.
 * message is only set when valid is false.
 */
function validateBackendUrl(url) {
  if (!url || !url.trim()) {
    return { valid: false, message: 'Backend URL cannot be empty.' }
  }
  if (!isValidBackendUrl(url.trim())) {
    return {
      valid: false,
      message:
        `"${url}" is not a valid URL. ` +
        'Include the protocol, e.g. http://127.0.0.1:8000'
    }
  }
  return { valid: true }
}

/**
 * Validates that a local config object has the fields commands rely on.
 * Used after reading .contextbridge/config.json to catch a corrupted or
 * hand-edited file before it causes a confusing downstream error.
 */
function validateLocalConfig(config) {
  const missing = []
  if (!config || typeof config !== 'object') {
    return { valid: false, message: 'Local config is missing or unreadable. Run ctxbridge init.' }
  }
  if (!config.project_id)   missing.push('project_id')
  if (!config.backend_url)  missing.push('backend_url')

  if (missing.length > 0) {
    return {
      valid: false,
      message:
        `.contextbridge/config.json is missing required field(s): ${missing.join(', ')}. ` +
        'Run ctxbridge init to relink this project.'
    }
  }
  return { valid: true }
}

module.exports = { isValidBackendUrl, validateBackendUrl, validateLocalConfig }