import * as commonmark from 'commonmark'
import escape from 'escape-html'
import fs from 'node:fs'
import glob from 'glob'
import yaml from 'js-yaml'
import { spawnSync } from 'node:child_process'

const schema = loadYAMLFile('schema.yml')

const widthProperties = schema.properties.widths.items.properties
const widthColumns = []
for (const [key, subschema] of Object.entries(widthProperties)) {
  if (key === 'name') continue
  widthColumns.push({ key, header: subschema.title, subschema })
}

const entries = glob.sync('entries/*.yml')
  .map(file => {
    const entry = loadYAMLFile(file)
    entry.file = file
    entry.updated = spawnSync('git', ['log', '-1', '--date=iso-strict', '--pretty="%ci"', file]).stdout.toString().trim()
    return entry
  })
  .sort(byName)

fs.writeFileSync('index.html', `
<!doctype html>
<html lang=en-US>
  <head>
    <meta charset=UTF-8>
    <meta name=viewport content="width=device-width, initial-scale=1">
    <title>Narrow-Width Shoes</title>
    <link rel=stylesheet href=https://css.kemitchell.com/readable.css>
    <link rel=stylesheet href=styles.css>
  </head>
  <body>
    <header>
      <h1>Narrow-Width Shoes</h1>
      ${renderMarkdown(fs.readFileSync('header.md', 'utf8'))}
    </header>
    <nav>
      Jump To:
      ${entries.map(({ name }) => `<a href="#${toID(name)}">${escape(name)}</a>`).join('')}
    </nav>
    <main>
      <ol class=entries>
      ${entries.map(renderEntry).join('')}
      </ol>
    </main>
  </body>
</html>
`.trim())

function byName (a, b) {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}

function renderEntry ({ file, name, homepage, tags, widths, updated }) {
  return `
<li id="${toID(name)}">
  <h2>${escape(name)}</h2>
  <a href="https://${escape(homepage)}">${escape(homepage)}</a>
  <ul class=tags>${tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul>
  ${renderWidths(widths)}
  <p class=updated>Last Updated ${escape(new Date(updated).toLocaleDateString('en-us', { timeZone: 'UTC', dateStyle: 'long' }))}</p>
  <p class=edit><a href="https://github.com/kemitchell/narrowwidthshoes.kemitchell.com/edit/main/${file}">Edit data file on GitHub</a></p>
</li>
  `.trim()
}

function renderWidths (widths) {
  return `
<table class=widths>
  <thead>
    <tr>
      <th>Width</th>
    ${widthColumns.map(({ header }) => `<th>${escape(header)}</th>`).join('')}
    </tr>
  </thead>
  ${widths.map(renderWidthRow).join('')}
</table>
  `.trim()
}

function renderWidthRow (width) {
  return `
<tr>
  <td>${escape(width.name)}</td>
  ${widthColumns.map(({ key, subschema }) => {
    if (subschema.type === 'boolean') {
      const value = width[key]
      let display
      if (value === true) display = 'Yes'
      else if (value === false) display = 'No'
      else display = '?'
      return `<td>${display}</td>`
    } else if (key === 'models') {
      const models = width[key]
      return typeof models === 'string'
        ? `<td>${models[0].toUpperCase() + models.slice(1)}</td>`
        : `<td>${renderModels(models)}</td>`
    } else {
      return ''
    }
  }).join('')}
</tr>
  `.trim()
}

function renderModels (models) {
  return `
<ul class=models>
  ${models.map(({ name, page }) => `<li><a href="${escape(page)}">${escape(name)}</a></li>`).join('')}
</ul>
  `.trim()
}

function loadYAMLFile (file) {
  return yaml.load(fs.readFileSync(file, 'utf8'))
}

function toID (string) {
  return string.toLowerCase()
    .replace(/é/g, 'e')
    .replace(/[^a-z ]/g, '')
    .replace(/ +/g, '-')
}

function renderMarkdown (string) {
  const reader = new commonmark.Parser({ smart: true })
  const writer = new commonmark.HtmlRenderer()
  const parsed = reader.parse(string)
  return writer.render(parsed)
}
