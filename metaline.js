'use strict'

function deepmergeArray(options) {
  const deepmerge = options.deepmerge
  const clone = options.clone
  return function (target, source) {
    let i = 0
    const tl = target.length
    const sl = source.length
    const il = Math.max(target.length, source.length)
    const result = new Array(il)
    for (i = 0; i < il; ++i) {
      if (i < sl) {
        result[i] = deepmerge(target[i], source[i])
      } else {
        result[i] = clone(target[i])
      }
    }
    return result
  }
}

const deepmerge = require('@fastify/deepmerge')({
  mergeArray: deepmergeArray
})

// TODO this shold be a parser that generates a function
function parsePhrase (phrase) {
  const path = []

  let startKey = 0
  let i = 0
  for (; i < phrase.length; i++) {
    const c = phrase[i]

    if (phrase.charCodeAt(i) === 46) { // .
      path.push({
        type: 'key',
        key: phrase.slice(startKey, i)
      })
      startKey = i + 1
    }

    if (phrase.charCodeAt(i) === 36) { // $
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
      path.push({
        type: 'property',
        key: phrase.slice(i +1)
      })
    }

    if (phrase.charCodeAt(i) === 58) { // :
      let sliced = phrase.slice(i + 1)
      let value = parseInt(sliced)
      if (isNaN(value)) {
        value = parseFloat(sliced)
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
        const value = input.map(item => {
          return transformPhrase(item, remaining)
        })

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
