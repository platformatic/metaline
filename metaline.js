'use strict'

function deepmergeArray (options) {
  const deepmerge = options.deepmerge
  return function (target, source) {
    let i = 0
    const result = new Array(target.length)
    for (i = 0; i < target.length; ++i) {
      // This will throw if the items are not equal in length
      // but this cannot happen with the current usage
      result[i] = deepmerge(target[i], source[i])
    }
    return result
  }
}

const deepmerge = require('@fastify/deepmerge')({
  mergeArray: deepmergeArray
})

class ParseError extends Error {
  constructor (token, position) {
    super(`Unexpected token \`${token}\` at position ${position}`)
  }
}

// TODO this shold be a parser that generates a function
function parsePhrase (phrase) {
  const path = []

  let startKey = 0
  let i = 0
  for (; i < phrase.length; i++) {
    if (phrase.charCodeAt(i) === 46) { // .
      if (i === 0) {
        throw new ParseError(phrase[i], i)
      }
      path.push({
        type: 'key',
        key: phrase.slice(startKey, i)
      })
      startKey = i + 1
    }

    if (phrase.charCodeAt(i) === 36) { // $
      if (startKey !== i) {
        throw new ParseError(phrase[i], i)
      }
      if (phrase.charCodeAt(i + 1) === 62) { // >
        path.push({
          type: 'loop'
        })
        i += 2
        startKey = i
      } else {
        path.push({
          type: 'input'
        })
      }
    }

    if (phrase.charCodeAt(i) === 35) { // #
      if (startKey !== i) {
        throw new ParseError(phrase[i], i)
      }
      path.push({
        type: 'property',
        key: phrase.slice(i + 1)
      })
    }

    if (phrase.charCodeAt(i) === 58) { // :
      const sliced = phrase.slice(i + 1)
      let value = parseFloat(sliced)
      if (isNaN(value)) {
        value = parseInt(sliced)
        if (isNaN(value)) {
          value = sliced
        }
      }
      path.push({
        type: 'value',
        key: phrase.slice(startKey, i),
        value
      })
      break
    }
  }

  return function (input) {
    return transformPhrase(input, path)
  }

  function transformPhrase (input, path) {
    let out = {}
    let obj = out
    let currentKey = null
    for (let i = 0; i < path.length; i++) {
      const chunk = path[i]
      if (chunk.type === 'input') {
        if (currentKey) {
          obj[currentKey] = input
        } else {
          out = input
        }
      } else if (chunk.type === 'key') {
        if (currentKey) {
          obj[currentKey] = {}
          obj = obj[currentKey]
        }
        currentKey = chunk.key
      } else if (chunk.type === 'value') {
        const dest = {
          [chunk.key]: chunk.value
        }
        if (currentKey) {
          obj[currentKey] = dest
        } else {
          out = dest
        }
      } else if (chunk.type === 'property') {
        if (currentKey) {
          obj[currentKey] = input[chunk.key]
        } else {
          out = input[chunk.key]
        }
      } else if (chunk.type === 'loop') {
        const remaining = path.slice(i + 1)
        const value = [...new Set(input.map(item => {
          return transformPhrase(item, remaining)
        }).flat())]

        if (currentKey) {
          obj[currentKey] = value
        } else {
          out = value
        }
        break
      }
    }
    return out
  }
}

function metaline (str) {
  const phrases = str.split(';')

  const fns = phrases.map(parsePhrase)

  function transform (input) {
    let out = {}
    for (const fn of fns) {
      out = deepmerge(out, fn(input))
    }
    return out
  }

  return transform
}

module.exports = metaline
module.exports.metaline = metaline
