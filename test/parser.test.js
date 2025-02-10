'use strict'

const { test } = require('node:test')
const { deepEqual, throws } = require('node:assert/strict')
const { parse } = require('../lib/parser.js')

test('basic path expressions', async (t) => {
  await t.test('simple property path', () => {
    const ast = parse('foo.bar')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'Phrase',
        segments: [
          { type: 'PathSegment', value: 'foo', position: 0 },
          { type: 'PathSegment', value: 'bar', position: 4 }
        ]
      }]
    })
  })

  await t.test('path with input reference', () => {
    const ast = parse('where.directorId.in.$')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'Phrase',
        segments: [
          { type: 'PathSegment', value: 'where', position: 0 },
          { type: 'PathSegment', value: 'directorId', position: 6 },
          { type: 'PathSegment', value: 'in', position: 17 },
          { type: 'InputReference', position: 20 }
        ]
      }]
    })
  })
})

test('value assignments', async (t) => {
  await t.test('numeric value', () => {
    const ast = parse('limit:99')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'ValuePhrase',
        segments: [{
          type: 'ValueAssignment',
          key: 'limit',
          value: 99,
          position: 0
        }]
      }]
    })
  })

  await t.test('decimal value', () => {
    const ast = parse('limit:99.9')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'ValuePhrase',
        segments: [{
          type: 'ValueAssignment',
          key: 'limit',
          value: 99.9,
          position: 0
        }]
      }]
    })
  })

  await t.test('string value', () => {
    const ast = parse('status:active')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'ValuePhrase',
        segments: [{
          type: 'ValueAssignment',
          key: 'status',
          value: 'active',
          position: 0
        }]
      }]
    })
  })
})

test('map operations', async (t) => {
  await t.test('simple map with property access', () => {
    const ast = parse('$>#id')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'MapPhrase',
        segments: [
          { type: 'MapOperator', position: 0 },
          { type: 'PropertyAccess', property: 'id', position: 2 }
        ]
      }]
    })
  })

  await t.test('map with path and property access', () => {
    const ast = parse('$>id.#directorId')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'MapPhrase',
        segments: [
          { type: 'MapOperator', position: 0 },
          { type: 'PathSegment', value: 'id', position: 2 },
          { type: 'PropertyAccess', property: 'directorId', position: 5 }
        ]
      }]
    })
  })
})

test('multiple phrases', async (t) => {
  await t.test('path and value combination', () => {
    const ast = parse('where.id.in.$;limit:99')
    deepEqual(ast, {
      type: 'Program',
      phrases: [
        {
          type: 'Phrase',
          segments: [
            { type: 'PathSegment', value: 'where', position: 0 },
            { type: 'PathSegment', value: 'id', position: 6 },
            { type: 'PathSegment', value: 'in', position: 9 },
            { type: 'InputReference', position: 12 }
          ]
        },
        {
          type: 'ValuePhrase',
          segments: [{
            type: 'ValueAssignment',
            key: 'limit',
            value: 99,
            position: 14
          }]
        }
      ]
    })
  })

  await t.test('multiple map operations', () => {
    const ast = parse('$>id.#directorId;$>foo.#bar')
    deepEqual(ast, {
      type: 'Program',
      phrases: [
        {
          type: 'MapPhrase',
          segments: [
            { type: 'MapOperator', position: 0 },
            { type: 'PathSegment', value: 'id', position: 2 },
            { type: 'PropertyAccess', property: 'directorId', position: 5 }
          ]
        },
        {
          type: 'MapPhrase',
          segments: [
            { type: 'MapOperator', position: 17 },
            { type: 'PathSegment', value: 'foo', position: 19 },
            { type: 'PropertyAccess', property: 'bar', position: 23 }
          ]
        }
      ]
    })
  })
})

test('error cases', async (t) => {
  await t.test('invalid start with dot', () => {
    throws(() => parse('.#'), {
      message: 'Parser error at position 0: Expected IDENTIFIER, got DOT'
    })
  })

  await t.test('hash without property name', () => {
    throws(() => parse('foo#'), {
      message: 'Parser error at position 4: Expected IDENTIFIER, got EOF'
    })
  })

  await t.test('dollar without arrow or following segment', { skip: true }, () => {
    throws(() => parse('foo$'), {
      message: 'Parser error at position 3: Unexpected token'
    })
  })

  await t.test('colon without value', () => {
    throws(() => parse('limit:'), {
      message: 'Parser error at position 6: Expected number or identifier after colon'
    })
  })

  await t.test('invalid character', () => {
    throws(() => parse('foo@bar'), {
      message: "Invalid character '@' at position 3"
    })
  })
})

test('whitespace handling', async (t) => {
  await t.test('spaces around dots', () => {
    const ast = parse('where . id . in . $')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'Phrase',
        segments: [
          { type: 'PathSegment', value: 'where', position: 0 },
          { type: 'PathSegment', value: 'id', position: 8 },
          { type: 'PathSegment', value: 'in', position: 13 },
          { type: 'InputReference', position: 18 }
        ]
      }]
    })
  })

  await t.test('spaces around colon', () => {
    const ast = parse('limit : 99')
    deepEqual(ast, {
      type: 'Program',
      phrases: [{
        type: 'ValuePhrase',
        segments: [{
          type: 'ValueAssignment',
          key: 'limit',
          value: 99,
          position: 0
        }]
      }]
    })
  })
})
