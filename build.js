import escape from 'escape-html'
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
  .map(loadYAMLFile)
  .sort(byName)

fs.writeFileSync('index.html', `
<!doctype html>
<html lang=en-US>
  <head>
    <meta charset=UTF-8>
    <meta name=viewport content="width=device-width, initial-scale=1">
    <title>Narrow-Width Shoes</title>
    <link rel=stylesheet href=https://css.kemitchell.com/readable.css>
    <style>
td, th {
  padding: 1ex;
}

td:first-child,
th:first-child {
  padding-left: 0;
}

td:last-child,
th:last-child {
  padding-right: 0;
}

.entries,
.tags,
.models {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

.entries > li {
  border: 1px solid black;
  padding: 0 1em 1em 1em;
  margin: 1rem 0;
}

.tags > li {
  display: inline-block;
  padding-right: 1ex;
}
    </style>
  </head>
  <body>
    <header>
      <h1>Narrow-Width Shoes</h1>
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

function renderEntry ({ name, homepage, tags, widths }) {
  return `
<li id="${toID(name)}">
  <h2>${escape(name)}</h2>
  <a href="https://${escape(homepage)}">${escape(homepage)}</a>
  <ul class=tags>${tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul>
  ${renderWidths(widths)}
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
      const text = width[key] ? 'Yes' : 'No'
      return `<td>${text}</td>`
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
