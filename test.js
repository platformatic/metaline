'use strict'

const { test } = require('node:test')
const { deepEqual } = require('node:assert/strict')
const metaline = require('./metaline.js')

function buildTest (str, input, output, opts = {}) {
  test(str, opts, t => {
    const fn = metaline(str)
    deepEqual(fn(input), output)
  })
}

buildTest('where.directorId.in.$', [1, 2], { where: { directorId: { in: [1, 2] } }})
buildTest('limit:99', null, { limit: 99 })
buildTest('where.directorId.in.$;limit:99', [1, 2], { where: { directorId: { in: [1, 2] } }, limit: 99 })
buildTest('$>#id', [{ id: 1 }, { id: 2 }], [1, 2])
buildTest('where.id.in.$>#id;limit:99', [{ id: 1 }, { id: 2 }], { where: { id: { in: [1, 2] } }, limit: 99 })
buildTest('$>id.#directorId', [{ directorId: 1 }, { directorId: 2 }], [{ id: 1 }, { id: 2 }])
buildTest('$>id.#directorId;$>foo.#bar', [{ directorId: 1, bar: 2 }, { directorId: 2, bar: 3 }], [{ id: 1, foo: 2 }, { id: 2, foo: 3 }])
