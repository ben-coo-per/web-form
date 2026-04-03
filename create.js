#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const args = process.argv.slice(2)
const skipInstall = args.includes('--skip-install')
const formName = args.find(a => !a.startsWith('--'))

if (!formName) {
  console.error('Usage: form-builder <form-name> [--skip-install]')
  process.exit(1)
}

if (!/^[a-z0-9-]+$/.test(formName)) {
  console.error('Error: form name must be lowercase alphanumeric with hyphens only')
  process.exit(1)
}

const outDir = path.join(process.cwd(), formName)

if (fs.existsSync(outDir)) {
  console.error(`Error: directory "${formName}" already exists`)
  process.exit(1)
}

const templateDir = path.join(__dirname, 'template')

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      let content = fs.readFileSync(srcPath, 'utf8')
      content = content.replace(/\{\{FORM_NAME\}\}/g, formName)
      fs.writeFileSync(destPath, content)
    }
  }
}

console.log(`\nCreating form project: ${formName}`)
copyDir(templateDir, outDir)
console.log(`  Copied template files`)

if (!skipInstall) {
  console.log(`  Installing dependencies...`)
  try {
    execSync('npm install', { cwd: outDir, stdio: 'inherit' })
  } catch {
    console.warn('  npm install failed — run it manually in the project directory')
  }
}

console.log(`
Done! Your form project is ready at ./${formName}/

Next steps:
  1. cd ${formName}
  2. Edit config.js       — define your form fields
  3. Edit public/index.html — write the form HTML (match field names to config.js)
  4. npm start            — run locally on http://localhost:3000
  5. fly launch           — first-time Fly.io deploy (then \`fly deploy\` after)

Admin panel: http://localhost:3000/admin  (password: see config.js)
CSV export:  http://localhost:3000/export.csv
`)
