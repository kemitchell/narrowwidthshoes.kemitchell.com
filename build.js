import escape from 'escape-html'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import glob from 'glob'
import yaml from 'js-yaml'

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
      <p>This page lists companies offering shoes and boots in narrow mens widths. If you know of a company not listed here, <a href=mailto:kyle@kemitchell.com?subject=Narrow-Width%20Shoes>e-mail me about it at kyle@kemitchell.com</a>.</p>
      <p>Note that the standard womens width is often the same B width as mens narrow. Unless your feet are longer than the whole womens range, you might find a womens size that fits you ideally. Just beware of subtle changes between mens and womens models. Companies sometimes skimp on womens versions.</p>
    </header>
    <nav>
      Jump To:
      ${entries.map(({ name }) => `<a href="#${toID(name)}">${escape(name)}</a>`).join(', ')}
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
<!--<details>
  <summary>Widths</summary>-->
  <table class=widths>
    <thead>
      <tr>
        <th>Width</th>
      ${widthColumns.map(({ header }) => `<th>${escape(header)}</th>`).join('')}
      </tr>
    </thead>
    ${widths.map(renderWidthRow).join('')}
  </table>
<!--</details>-->
  `.trim()
}

function renderWidthRow (width) {
  return `
<tr>
  <th>${escape(width.name)}</th>
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
  return string.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '-')
}
