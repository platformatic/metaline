'use strict'

const { parse } = require('./lib/parser.js')
const { generate } = require('./lib/generator.js')

function metaline (str) {
  const ast = parse(str)
  const code = generate(ast)
  return new Function('input', code + '\nreturn transform(input);')
}

module.exports = metaline
module.exports.metaline = metaline
