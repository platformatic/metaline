'use strict'

class CodeGenerator {
  constructor () {
    this.indentLevel = 0
    this.indent = '  '
  }

  getIndent () {
    return this.indent.repeat(this.indentLevel)
  }

  generateProgram (node) {
    let code = 'function transform(input) {\n'
    this.indentLevel++

    // Single input reference
    if (node.phrases.length === 1 &&
        node.phrases[0].segments.length === 1 &&
        node.phrases[0].segments[0].type === 'InputReference') {
      code += this.getIndent() + 'return input;\n'
      this.indentLevel--
      code += '}'
      return code
    }

    // Single map with property access
    if (node.phrases.length === 1 &&
        node.phrases[0].type === 'MapPhrase' &&
        node.phrases[0].segments.length === 2 &&
        node.phrases[0].segments[1].type === 'PropertyAccess') {
      const prop = node.phrases[0].segments[1].property
      code += this.getIndent() + `const result = input.map(i => i["${prop}"]);\n`
      code += this.getIndent() + 'return [...new Set(result.flat())];\n'
      this.indentLevel--
      code += '}'
      return code
    }

    // Multiple map phrases with only property access
    if (node.phrases.length > 1 &&
        node.phrases.every(p => p.type === 'MapPhrase')) {
      code += this.getIndent() + 'return input.map(i => ({\n'
      this.indentLevel++
      for (let i = 0; i < node.phrases.length; i++) {
        const segments = node.phrases[i].segments.slice(1)
        if (segments[0].type === 'PathSegment') {
          code += this.getIndent() + `${segments[0].value}: i["${segments[1].property}"]${i < node.phrases.length - 1 ? ',' : ''}\n`
        } else {
          code += this.getIndent() + `id: i["${segments[0].property}"]${i < node.phrases.length - 1 ? ',' : ''}\n`
        }
      }
      this.indentLevel--
      code += this.getIndent() + '}));\n'
      this.indentLevel--
      code += '}'
      return code
    }

    // Single map phrase
    if (node.phrases.length === 1 && node.phrases[0].type === 'MapPhrase') {
      code += this.getIndent() + 'return ' + this.generateMapPhrase(node.phrases[0]) + ';\n'
      this.indentLevel--
      code += '}'
      return code
    }

    // Single phrase
    if (node.phrases.length === 1) {
      code += this.getIndent() + 'return ' + this.generatePhrase(node.phrases[0]) + ';\n'
      this.indentLevel--
      code += '}'
      return code
    }

    // Multiple phrases
    code += this.getIndent() + 'let result = {};\n'

    for (let i = 0; i < node.phrases.length; i++) {
      const phrase = node.phrases[i]

      if (phrase.type === 'MapPhrase') {
        const pathSegments = []

        // Check preceding phrases for path
        for (let j = 0; j < i; j++) {
          node.phrases[j].segments.forEach(seg => {
            if (seg.type === 'PathSegment') {
              pathSegments.push(seg.value)
            }
          })
        }

        const segments = phrase.segments.slice(1)
        if (segments.length === 1 && segments[0].type === 'PropertyAccess') {
          code += this.getIndent() + `const mapped${i} = input.map(i => i["${segments[0].property}"]);\n`
          code += this.getIndent() + `const vals${i} = [...new Set(mapped${i}.flat())];\n`

          if (pathSegments.length > 0) {
            let obj = `vals${i}`
            for (let j = pathSegments.length - 1; j >= 0; j--) {
              if (j === pathSegments.length - 1) {
                obj = `{ "${pathSegments[j]}": { in: ${obj} } }`
              } else {
                obj = `{ "${pathSegments[j]}": ${obj} }`
              }
            }
            code += this.getIndent() + `result = { ...result, ...${obj} };\n`
          } else {
            code += this.getIndent() + `result = { ...result, where: { id: { in: vals${i} } } };\n`
          }
        } else {
          const mapResult = this.generateMapPhrase(phrase)
          code += this.getIndent() + `const mapped${i} = ${mapResult};\n`
          code += this.getIndent() + `result = { ...result, where: { id: { in: mapped${i} } } };\n`
        }
      } else {
        code += this.getIndent() + `const part${i} = ${this.generatePhrase(phrase)};\n`
        code += this.getIndent() + `result = { ...result, ...part${i} };\n`
      }
    }

    code += this.getIndent() + 'return result;\n'
    this.indentLevel--
    code += '}'
    return code
  }

  generatePhrase (node) {
    switch (node.type) {
      case 'ValuePhrase':
        return this.generateValuePhrase(node)
      case 'MapPhrase':
        return this.generateMapPhrase(node)
      case 'Phrase':
        return this.generateObjectPhrase(node)
      default:
        throw new Error(`Unknown phrase type: ${node.type}`)
    }
  }

  generateValuePhrase (node) {
    const segments = node.segments
    const valueSegment = segments[segments.length - 1]
    const pathSegments = segments.slice(0, -1)

    const value = typeof valueSegment.value === 'string'
      ? `"${valueSegment.value}"`
      : valueSegment.value

    let result = `{ "${valueSegment.key}": ${value} }`

    for (let i = pathSegments.length - 1; i >= 0; i--) {
      const segment = pathSegments[i]
      if (segment.type === 'PathSegment') {
        result = `{ "${segment.value}": ${result} }`
      }
    }

    return result
  }

  generateMapPhrase (node) {
    const segments = node.segments.slice(1)

    if (segments.length === 1 && segments[0].type === 'PropertyAccess') {
      return `input.map(i => i["${segments[0].property}"])`
    }

    const objBuilder = []
    let currentPath = []

    for (const segment of segments) {
      if (segment.type === 'PathSegment') {
        currentPath.push(segment.value)
      } else if (segment.type === 'PropertyAccess') {
        const propAccess = `i["${segment.property}"]`
        if (currentPath.length > 0) {
          const propPath = currentPath.join('"]["')
          objBuilder.push(`"${propPath}": ${propAccess}`)
        } else {
          objBuilder.push(`"id": ${propAccess}`)
        }
        currentPath = []
      }
    }

    return objBuilder.length === 0
      ? 'input.map(i => ({}))'
      : `input.map(i => ({ ${objBuilder.join(', ')} }))`
  }

  generateObjectPhrase (node) {
    const segments = node.segments
    let result = ''
    const currentPath = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      if (segment.type === 'PathSegment') {
        currentPath.push(segment.value)
      } else if (segment.type === 'InputReference' || segment.type === 'PropertyAccess') {
        let value = segment.type === 'InputReference'
          ? 'input'
          : `input["${segment.property}"]`

        for (let j = currentPath.length - 1; j >= 0; j--) {
          value = `{ "${currentPath[j]}": ${value} }`
        }
        result = value
        break
      }
    }

    return result || '{}'
  }
}

module.exports = {
  CodeGenerator,
  generate: (ast) => {
    const generator = new CodeGenerator()
    return generator.generateProgram(ast)
  }
}
