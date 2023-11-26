import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import assert from 'node:assert'
import fs from 'node:fs'
import { globSync } from 'glob'
import yaml from 'js-yaml'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const schema = loadYAMLFile('schema.yml')
ajv.validateSchema(schema)
assert.equal(ajv.errors, null)
const validate = ajv.compile(schema)

const files = globSync('entries/*.yml')
for (const file of files) {
  const entry = loadYAMLFile(file)
  validate(entry)
  assert.equal(validate.errors, null, `${file} conforms to schema`)
}

function loadYAMLFile (file) {
  return yaml.load(fs.readFileSync(file, 'utf8'))
}
