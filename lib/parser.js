'use strict'

const { Lexer, TokenType } = require('./lexer.js')

class Parser {
  constructor(lexer) {
    this.lexer = lexer
    this.currentToken = this.lexer.getNextToken()
  }

  error(message, position = null) {
    const pos = position !== null ? position : this.currentToken.position
    throw new Error(`Parser error at position ${pos}: ${message}`)
  }

  eat(tokenType) {
    if (this.currentToken.type === tokenType) {
      const token = this.currentToken
      this.currentToken = this.lexer.getNextToken()
      return token
    }
    this.error(`Expected ${tokenType}, got ${this.currentToken.type}`)
  }

  parsePhrase() {
    const node = {
      type: 'Phrase',
      segments: []
    }

    // Handle start of phrase
    if (this.currentToken.type === TokenType.DOT) {
      this.error('Expected IDENTIFIER, got DOT')
    }

    while (this.currentToken.type !== TokenType.SEMICOLON && 
           this.currentToken.type !== TokenType.EOF) {
      
      // Handle dollar ($) tokens
      if (this.currentToken.type === TokenType.DOLLAR) {
        const dollarPos = this.currentToken.position
        this.eat(TokenType.DOLLAR)
        
        if (this.currentToken.type === TokenType.ARROW) {
          this.eat(TokenType.ARROW)
          node.type = 'MapPhrase'
          node.segments.push({
            type: 'MapOperator',
            position: dollarPos
          })
        } else {
          // Input reference
          node.segments.push({
            type: 'InputReference',
            position: dollarPos
          })
          
          // Can only be followed by semicolon or EOF
          if (this.currentToken.type !== TokenType.SEMICOLON && 
              this.currentToken.type !== TokenType.EOF) {
            this.error('Unexpected token')
          }
          break
        }
        continue
      }

      // Handle dots (.)
      if (this.currentToken.type === TokenType.DOT) {
        this.eat(TokenType.DOT)
        if (this.currentToken.type !== TokenType.IDENTIFIER &&
            this.currentToken.type !== TokenType.HASH &&
            this.currentToken.type !== TokenType.DOLLAR) {
          this.error('Unexpected token')
        }
        continue
      }

      // Handle hash (#) property access
      if (this.currentToken.type === TokenType.HASH) {
        const hashPos = this.currentToken.position
        this.eat(TokenType.HASH)
        if (this.currentToken.type !== TokenType.IDENTIFIER) {
          this.error(`Expected IDENTIFIER, got ${this.currentToken.type}`)
        }
        const propertyToken = this.eat(TokenType.IDENTIFIER)
        node.segments.push({
          type: 'PropertyAccess',
          property: propertyToken.value,
          position: hashPos
        })
        continue
      }

      // Handle identifiers and value assignments
      if (this.currentToken.type === TokenType.IDENTIFIER) {
        const identifier = this.eat(TokenType.IDENTIFIER)
        
        if (this.currentToken.type === TokenType.COLON) {
          this.eat(TokenType.COLON)
          let value

          if (this.currentToken.type === TokenType.NUMBER) {
            value = this.eat(TokenType.NUMBER).value
          } else if (this.currentToken.type === TokenType.IDENTIFIER) {
            value = this.eat(TokenType.IDENTIFIER).value
          } else {
            this.error('Expected number or identifier after colon')
          }

          node.type = 'ValuePhrase'
          node.segments = [{
            type: 'ValueAssignment',
            key: identifier.value,
            value: value,
            position: identifier.position
          }]
          break
        } else {
          node.segments.push({
            type: 'PathSegment',
            value: identifier.value,
            position: identifier.position
          })
        }
        continue
      }

      this.error('Unexpected token')
    }

    // Eat semicolon if present
    if (this.currentToken.type === TokenType.SEMICOLON) {
      this.eat(TokenType.SEMICOLON)
    }

    return node
  }

  parse() {
    // Handle empty input
    if (this.currentToken.type === TokenType.EOF) {
      return {
        type: 'Program',
        phrases: []
      }
    }

    const program = {
      type: 'Program',
      phrases: []
    }

    // Parse phrases until EOF
    do {
      program.phrases.push(this.parsePhrase())
    } while (this.currentToken.type !== TokenType.EOF)

    return program
  }
}

function parse(input) {
  const lexer = new Lexer(input)
  const parser = new Parser(lexer)
  return parser.parse()
}

module.exports = {
  Parser,
  parse
}