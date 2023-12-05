'use strict'

const deepmerge = require('@fastify/deepmerge')({
  mergeArray: true
})

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
      path.push({
        type: 'input'
      })
      break
    }

    /*
    if (phrase.charCodeAt(i) === 45) { // -
      path.push(phrase.slice(startKey, i))
      startKey = i + 1
    }

    if (phrase.charCodeAt(i) === 62) { // >
      path.push(phrase.slice(startKey, i))
      startKey = i + 1
      if (phrase.charCodeAt(i + 1) === 35) { // #
        path.push(Input)
        i++
      }
    }
    */

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

  return function transformPhrase (input) {
    let out = {}
    let obj = out
    let currentKey = null
    for (const chunk of path) {
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
