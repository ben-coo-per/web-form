const http = require('http')
const fs = require('fs')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')
const config = require('./config')

const PORT = process.env.PORT || 3000
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db')
const TABLE = config.formName.replace(/[^a-z0-9_]/gi, '_')

// --- DB setup ---

const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')

const jsonFields = new Set(config.fields.filter(f => f.type === 'JSON').map(f => f.name))
const cols = config.fields.map(f => `${f.name} ${f.type === 'JSON' ? 'TEXT' : f.type}`).join(', ')
db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  ${cols}
)`)

const insertStmt = db.prepare(
  `INSERT INTO ${TABLE} (${config.fields.map(f => f.name).join(', ')})
   VALUES (${config.fields.map(() => '?').join(', ')})`
)

// --- Helpers ---

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body)
        const obj = {}
        for (const [k, v] of params) obj[k] = v.trim()
        resolve(obj)
      } catch {
        reject(new Error('Failed to parse body'))
      }
    })
    req.on('error', reject)
  })
}

function checkAuth(req) {
  const auth = req.headers['authorization'] || ''
  const encoded = auth.replace('Basic ', '')
  if (!encoded) return false
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  const [, pass] = decoded.split(':')
  return pass === config.adminPassword
}

function send401(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Admin"',
    'Content-Type': 'text/plain',
  })
  res.end('Unauthorized')
}

function serveFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
}

// --- Route handlers ---

function handleSubmit(req, res) {
  parseBody(req).then(data => {
    const missing = config.fields
      .filter(f => f.required && !data[f.name])
      .map(f => f.name)

    if (missing.length) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing required fields', fields: missing }))
      return
    }

    const values = config.fields.map(f => {
      const val = data[f.name] ?? null
      if (jsonFields.has(f.name) && val !== null) {
        try { return JSON.stringify(JSON.parse(val)) } catch { return JSON.stringify(val) }
      }
      return val
    })
    insertStmt.run(...values)

    res.writeHead(302, { Location: '/?submitted=1' })
    res.end()
  }).catch(() => {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('Bad request')
  })
}

function handleAdmin(req, res) {
  if (!checkAuth(req)) return send401(res)

  const rows = db.prepare(`SELECT * FROM ${TABLE} ORDER BY created_at DESC`).all().map(deserializeRow)
  const headers = ['id', 'created_at', ...config.fields.map(f => f.name)]

  const tableRows = rows.map(row =>
    `<tr>${headers.map(h => `<td>${escapeHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`
  ).join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${config.formName} — Submissions</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 2rem; }
  h1 { margin-bottom: 1rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f5f5f5; }
  tr:hover td { background: #fafafa; }
  .meta { margin-bottom: 1rem; color: #666; }
  a { color: #0066cc; }
</style>
</head>
<body>
<h1>${config.formName} submissions</h1>
<p class="meta">${rows.length} total &mdash; <a href="/export.csv">Download CSV</a></p>
<table>
  <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body>
</html>`

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

function handleExport(req, res) {
  if (!checkAuth(req)) return send401(res)

  const rows = db.prepare(`SELECT * FROM ${TABLE} ORDER BY created_at ASC`).all().map(deserializeRow)
  const headers = ['id', 'created_at', ...config.fields.map(f => f.name)]

  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => csvCell(String(row[h] ?? ''))).join(','))
  ].join('\r\n')

  res.writeHead(200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="${config.formName}-${datestamp()}.csv"`,
  })
  res.end(csv)
}

// --- Utils ---

function deserializeRow(row) {
  if (!jsonFields.size) return row
  const out = { ...row }
  for (const field of jsonFields) {
    if (out[field]) {
      try { out[field] = JSON.stringify(JSON.parse(out[field]), null, 2) } catch {}
    }
  }
  return out
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function csvCell(val) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function datestamp() {
  return new Date().toISOString().slice(0, 10)
}

// --- Server ---

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`)

  if (req.method === 'GET' && url.pathname === '/') {
    serveFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html; charset=utf-8')
  } else if (req.method === 'POST' && url.pathname === '/submit') {
    handleSubmit(req, res)
  } else if (req.method === 'GET' && url.pathname === '/admin') {
    handleAdmin(req, res)
  } else if (req.method === 'GET' && url.pathname === '/export.csv') {
    handleExport(req, res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`${config.formName} running on http://localhost:${PORT}`)
  console.log(`Admin: http://localhost:${PORT}/admin  (password: ${config.adminPassword})`)
})
