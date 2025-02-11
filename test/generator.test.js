'use strict'

/* eslint-disable no-new-func */

const { test } = require('node:test')
const { deepEqual } = require('node:assert/strict')
const { parse } = require('../lib/parser.js')
const { generate } = require('../lib/generator.js')

function testGeneration (str, input, expected) {
  const ast = parse(str)
  console.log('AST for:', str)
  console.log(JSON.stringify(ast, null, 2))
  const code = generate(ast)
  console.log('Generated code:', code)
  const fn = new Function('input', code + '\nreturn transform(input);')
  deepEqual(fn(input), expected)
}

test('code generation', async (t) => {
  await t.test('basic input reference', () => {
    testGeneration('$', 1, 1)
  })

  await t.test('object with input', () => {
    testGeneration(
      'where.directorId.in.$',
      [1, 2],
      { where: { directorId: { in: [1, 2] } } }
    )
  })

  await t.test('value assignment', () => {
    testGeneration('limit:99', null, { limit: 99 })
  })

  await t.test('nested value assignment', () => {
    testGeneration('a.limit:99.9', null, { a: { limit: 99.9 } })
  })

  await t.test('multiple phrases', () => {
    testGeneration(
      'where.directorId.in.$;limit:99',
      [1, 2],
      { where: { directorId: { in: [1, 2] } }, limit: 99 }
    )
  })

  await t.test('array mapping with property access', () => {
    testGeneration(
      '$>#id',
      [{ id: 1 }, { id: 2 }],
      [1, 2]
    )
  })

  await t.test('complex mapping with multiple properties', () => {
    testGeneration(
      '$>id.#directorId;$>foo.#bar',
      [{ directorId: 1, bar: 2 }, { directorId: 2, bar: 3 }],
      [{ id: 1, foo: 2 }, { id: 2, foo: 3 }]
    )
  })
})
