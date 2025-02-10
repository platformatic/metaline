'use strict'

class CodeGenerator {
  constructor() {
    this.indentLevel = 0
    this.indent = '  '
  }

  getIndent() {
    return this.indent.repeat(this.indentLevel)
  }

  generateProgram(node) {
    // Generate the function wrapper
    let code = 'function transform(input) {\n'
    this.indentLevel++

    // For single phrases that are just input references, we can return directly
    if (node.phrases.length === 1 && 
        node.phrases[0].segments.length === 1 && 
        node.phrases[0].segments[0].type === 'InputReference') {
      code += this.getIndent() + 'return input;\n'
      this.indentLevel--
      code += '}'
      return code
    }

    // For single phrases, return directly
    if (node.phrases.length === 1) {
      code += this.getIndent() + 'return ' + this.generatePhrase(node.phrases[0]) + ';\n'
      this.indentLevel--
      code += '}'
      return code
    }

    // For multiple phrases
    code += this.getIndent() + 'const results = [];\n'
    
    // Generate code for each phrase
    for (const phrase of node.phrases) {
      const phraseCode = this.generatePhrase(phrase)
      code += this.getIndent() + 'results.push(' + phraseCode + ');\n'
    }

    // Return combined results
    code += this.getIndent() + 'if (results.every(r => Array.isArray(r))) {\n'
    this.indentLevel++
    code += this.getIndent() + 'return results[0].map((_, i) => Object.assign({}, ...results.map(r => r[i])));\n'
    this.indentLevel--
    code += this.getIndent() + '} else {\n'
    this.indentLevel++
    code += this.getIndent() + 'return Object.assign({}, ...results);\n'
    this.indentLevel--
    code += this.getIndent() + '}\n'

    this.indentLevel--
    code += '}'
    return code
  }

  generatePhrase(node) {
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

  generateValuePhrase(node) {
    // Collect path segments before the value assignment
    const path = []
    let valueSegment = null
    
    for (const segment of node.segments) {
      if (segment.type === 'ValueAssignment') {
        valueSegment = segment
      } else if (segment.type === 'PathSegment') {
        path.push(segment.value)
      }
    }

    // Format the value
    const value = typeof valueSegment.value === 'string'
      ? `"${valueSegment.value}"`
      : valueSegment.value
      
    // Build nested object from inside out
    let result = `{ "${valueSegment.key}": ${value} }`
    
    // Wrap in outer objects for each path segment
    for (let i = path.length - 1; i >= 0; i--) {
      result = `{ "${path[i]}": ${result} }`
    }
    
    return result
  }

  generateMapPhrase(node) {
    // If it's just a property access (e.g. $>#id), return simple map
    if (node.segments.length === 2 && node.segments[1].type === 'PropertyAccess') {
      return `input.map(item => item["${node.segments[1].property}"])`
    }
    
    let code = 'input.map(item => {\n'
    this.indentLevel++
    
    // Build the transformation object
    let currentPath = []
    let currentValue = null
    
    for (let i = 1; i < node.segments.length; i++) {
      const segment = node.segments[i]
      if (segment.type === 'PathSegment') {
        currentPath.push(segment.value)
      } else if (segment.type === 'PropertyAccess') {
        let result = `item["${segment.property}"]`
        for (let j = currentPath.length - 1; j >= 0; j--) {
          result = `{ "${currentPath[j]}": ${result} }`
        }
        currentPath = []
        currentValue = result
      }
    }
    
    code += this.getIndent() + `return ${currentValue || '{}'};\n`
    this.indentLevel--
    code += this.getIndent() + '})'
    return code
  }

  generateObjectPhrase(node) {
    let path = []
    let valueExpr = null
    
    for (const segment of node.segments) {
      switch (segment.type) {
        case 'PathSegment':
          path.push(segment.value)
          break
        case 'InputReference':
          valueExpr = 'input'
          break
        case 'PropertyAccess':
          valueExpr = `input["${segment.property}"]`
          break
      }
    }
    
    if (!valueExpr) {
      valueExpr = 'null'
    }
    
    // Build the object from inside out
    let result = valueExpr
    for (let i = path.length - 1; i >= 0; i--) {
      result = `{ "${path[i]}": ${result} }`
    }
    
    return result
  }
}

module.exports = {
  CodeGenerator,
  generate: (ast) => {
    const generator = new CodeGenerator()
    return generator.generateProgram(ast)
  }
}