'use strict'

const { test } = require('node:test')
const { deepEqual } = require('node:assert/strict')
const { parse } = require('../lib/parser.js')
const { generate } = require('../lib/generator.js')

function testGeneration(str, input, expected) {
  const ast = parse(str)
  console.log('AST for:', str)
  console.log(JSON.stringify(ast, null, 2))
  const code = generate(ast)
  console.log('Generated code:', code)
  const fn = new Function('input', code + '\nreturn transform(input);')
  deepEqual(fn(input), expected)
}

test('code generation', async (t) => {
  await t.test('object with input', () => {
    testGeneration(
      'where.directorId.in.$',
      [1, 2],
      { where: { directorId: { in: [1, 2] } } }
    )
  })
})
