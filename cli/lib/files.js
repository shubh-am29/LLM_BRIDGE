const fs   = require('fs')
const path = require('path')

const CB_DIR = '.contextbridge'

function ensureDir() {
  const dir = path.join(process.cwd(), CB_DIR)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function writeFile(filename, content) {
  const dir      = ensureDir()
  const filePath = path.join(dir, filename)
  const isJson   = typeof content === 'object'
  fs.writeFileSync(
    filePath,
    isJson ? JSON.stringify(content, null, 2) : content,
    'utf8'
  )
  return filePath
}

function readFile(filename) {
  const filePath = path.join(process.cwd(), CB_DIR, filename)
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath, 'utf8')
  try { return JSON.parse(content) } catch { return content }
}

function fileExists(filename) {
  return fs.existsSync(path.join(process.cwd(), CB_DIR, filename))
}

function listFiles() {
  const dir = path.join(process.cwd(), CB_DIR)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
}

function getFileStat(filename) {
  const filePath = path.join(process.cwd(), CB_DIR, filename)
  if (!fs.existsSync(filePath)) return null
  return fs.statSync(filePath)
}

module.exports = {
  writeFile,
  readFile,
  fileExists,
  listFiles,
  getFileStat,
  CB_DIR
}