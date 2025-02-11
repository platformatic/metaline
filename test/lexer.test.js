'use strict'

const { test } = require('node:test')
const { deepEqual, throws } = require('node:assert/strict')
const { Lexer, TokenType } = require('../lib/lexer.js')

test('basic tokens', async (t) => {
  await t.test('single characters', () => {
    const lexer = new Lexer('.$>#:;')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => t.type), [
      TokenType.DOT,
      TokenType.DOLLAR,
      TokenType.ARROW,
      TokenType.HASH,
      TokenType.COLON,
      TokenType.SEMICOLON,
      TokenType.EOF
    ])
  })

  await t.test('identifiers', () => {
    const lexer = new Lexer('where directorId in')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, value: t.value })), [
      { type: TokenType.IDENTIFIER, value: 'where' },
      { type: TokenType.IDENTIFIER, value: 'directorId' },
      { type: TokenType.IDENTIFIER, value: 'in' },
      { type: TokenType.EOF, value: null }
    ])
  })

  await t.test('numbers', () => {
    const lexer = new Lexer('99 99.9 100.5')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, value: t.value })), [
      { type: TokenType.NUMBER, value: 99 },
      { type: TokenType.NUMBER, value: 99.9 },
      { type: TokenType.NUMBER, value: 100.5 },
      { type: TokenType.EOF, value: null }
    ])
  })
})

test('complete expressions', async (t) => {
  await t.test('property access', () => {
    const lexer = new Lexer('where.directorId.in.$')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, value: t.value })), [
      { type: TokenType.IDENTIFIER, value: 'where' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.IDENTIFIER, value: 'directorId' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.IDENTIFIER, value: 'in' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.DOLLAR, value: '$' },
      { type: TokenType.EOF, value: null }
    ])
  })

  await t.test('value assignment', () => {
    const lexer = new Lexer('limit:99')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, value: t.value })), [
      { type: TokenType.IDENTIFIER, value: 'limit' },
      { type: TokenType.COLON, value: ':' },
      { type: TokenType.NUMBER, value: 99 },
      { type: TokenType.EOF, value: null }
    ])
  })

  await t.test('property extraction', () => {
    const lexer = new Lexer('$>#id')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, value: t.value })), [
      { type: TokenType.DOLLAR, value: '$' },
      { type: TokenType.ARROW, value: '>' },
      { type: TokenType.HASH, value: '#' },
      { type: TokenType.IDENTIFIER, value: 'id' },
      { type: TokenType.EOF, value: null }
    ])
  })

  await t.test('complex combination', () => {
    const lexer = new Lexer('where.id.in.$>#id;limit:99')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, value: t.value })), [
      { type: TokenType.IDENTIFIER, value: 'where' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.IDENTIFIER, value: 'id' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.IDENTIFIER, value: 'in' },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.DOLLAR, value: '$' },
      { type: TokenType.ARROW, value: '>' },
      { type: TokenType.HASH, value: '#' },
      { type: TokenType.IDENTIFIER, value: 'id' },
      { type: TokenType.SEMICOLON, value: ';' },
      { type: TokenType.IDENTIFIER, value: 'limit' },
      { type: TokenType.COLON, value: ':' },
      { type: TokenType.NUMBER, value: 99 },
      { type: TokenType.EOF, value: null }
    ])
  })
})

test('error handling', async (t) => {
  await t.test('invalid characters', () => {
    const lexer = new Lexer('@')
    throws(() => lexer.tokenize(), {
      message: "Invalid character '@' at position 0"
    })
  })

  await t.test('multiple dots in number', () => {
    const lexer = new Lexer('99.9.9')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, value: t.value })), [
      { type: TokenType.NUMBER, value: 99.9 },
      { type: TokenType.DOT, value: '.' },
      { type: TokenType.NUMBER, value: 9 },
      { type: TokenType.EOF, value: null }
    ])
  })
})

test('token positions', async (t) => {
  await t.test('tracks correct positions', () => {
    const lexer = new Lexer('where.id')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, position: t.position })), [
      { type: TokenType.IDENTIFIER, position: 0 },
      { type: TokenType.DOT, position: 5 },
      { type: TokenType.IDENTIFIER, position: 6 },
      { type: TokenType.EOF, position: 8 }
    ])
  })

  await t.test('handles whitespace correctly', () => {
    const lexer = new Lexer('where . id')
    const tokens = lexer.tokenize()

    deepEqual(tokens.map(t => ({ type: t.type, position: t.position })), [
      { type: TokenType.IDENTIFIER, position: 0 },
      { type: TokenType.DOT, position: 6 },
      { type: TokenType.IDENTIFIER, position: 8 },
      { type: TokenType.EOF, position: 10 }
    ])
  })
})
