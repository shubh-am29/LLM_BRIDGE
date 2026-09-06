#!/usr/bin/env node

const { program } = require('commander')
const chalk       = require('chalk')
const { init }          = require('../commands/init')
const { sync }          = require('../commands/sync')
const { exportContext } = require('../commands/export')
const { status }        = require('../commands/status')
const { health }        = require('../commands/health')

const VERSION = '0.1.0'

program
  .name('ctxbridge')
  .description(
    chalk.bold('ctxbridge CLI') + ' — Project memory for AI coding agents'
  )
  .version(VERSION, '-v, --version', 'Show version')

// ── contextbridge init ────────────────────────────────────────────────────────
program
  .command('init')
  .description('Link this folder to a ContextBridge project')
  .option('--backend <url>', 'Backend URL (overrides prompt)')
  .action(init)

// ── contextbridge sync ────────────────────────────────────────────────────────
program
  .command('sync')
  .description('Pull latest memory from CtxBridge and write local files')
  .action(sync)

// ── contextbridge export ──────────────────────────────────────────────────────
program
  .command('export')
  .description('Export project memory as agent-readable files')
  .option('--root', 'Also write AGENT-CONTEXT.md to project root')
  .action(exportContext)

// ── contextbridge status ──────────────────────────────────────────────────────
program
  .command('status')
  .description('Show project health and memory completeness')
  .action(status)

// ── contextbridge health ──────────────────────────────────────────────────────
program
  .command('health')
  .description('Check connectivity to the ContextBridge backend')
  .action(health)

// ── fallback ──────────────────────────────────────────────────────────────────
program.addHelpText('after', `
  Examples:
    $ ctxbridge init
    $ ctxbridge init --backend http://127.0.0.1:8000
    $ ctxbridge sync
    $ ctxbridge export
    $ ctxbridge export --root
    $ ctxbridge status
    $ ctxbridge health
`)

program.parse(process.argv)