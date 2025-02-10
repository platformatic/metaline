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
    const segments = []

    // Handle start of phrase
    if (this.currentToken.type === TokenType.DOT) {
      this.error('Expected IDENTIFIER, got DOT')
    }

    while (this.currentToken.type !== TokenType.SEMICOLON && 
           this.currentToken.type !== TokenType.EOF) {
      
      // Handle dots (.)
      if (this.currentToken.type === TokenType.DOT) {
        this.eat(TokenType.DOT)
        continue
      }

      // Handle dollar ($) tokens
      if (this.currentToken.type === TokenType.DOLLAR) {
        const dollarPos = this.currentToken.position
        this.eat(TokenType.DOLLAR)
        
        if (this.currentToken.type === TokenType.ARROW) {
          this.eat(TokenType.ARROW)
          const mapSegments = this.parseRemainingSegments()
          return {
            type: 'MapPhrase',
            segments: [
              { type: 'MapOperator', position: dollarPos },
              ...mapSegments
            ]
          }
        } else {
          // Add any collected path segments to the InputReference phrase
          return {
            type: 'Phrase',
            segments: [
              ...segments,
              { type: 'InputReference', position: dollarPos }
            ]
          }
        }
      }

      // Handle identifiers
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

          return {
            type: 'ValuePhrase',
            segments: [
              ...segments,
              {
                type: 'ValueAssignment',
                key: identifier.value,
                value: value,
                position: identifier.position
              }
            ]
          }
        }
        
        segments.push({
          type: 'PathSegment',
          value: identifier.value,
          position: identifier.position
        })
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
        segments.push({
          type: 'PropertyAccess',
          property: propertyToken.value,
          position: hashPos
        })
        continue
      }

      this.error('Unexpected token')
    }

    return {
      type: 'Phrase',
      segments
    }
  }

  parseRemainingSegments() {
    const segments = []
    
    while (this.currentToken.type !== TokenType.SEMICOLON && 
           this.currentToken.type !== TokenType.EOF) {
      
      if (this.currentToken.type === TokenType.DOT) {
        this.eat(TokenType.DOT)
        continue
      }

      if (this.currentToken.type === TokenType.IDENTIFIER) {
        const identifier = this.eat(TokenType.IDENTIFIER)
        segments.push({
          type: 'PathSegment',
          value: identifier.value,
          position: identifier.position
        })
        continue
      }

      if (this.currentToken.type === TokenType.HASH) {
        const hashPos = this.currentToken.position
        this.eat(TokenType.HASH)
        const propertyToken = this.eat(TokenType.IDENTIFIER)
        segments.push({
          type: 'PropertyAccess',
          property: propertyToken.value,
          position: hashPos
        })
        continue
      }

      this.error('Unexpected token')
    }

    return segments
  }

  parse() {
    if (this.currentToken.type === TokenType.EOF) {
      return {
        type: 'Program',
        phrases: []
      }
    }

    const phrases = []
    do {
      phrases.push(this.parsePhrase())
      if (this.currentToken.type === TokenType.SEMICOLON) {
        this.eat(TokenType.SEMICOLON)
      }
    } while (this.currentToken.type !== TokenType.EOF)

    return {
      type: 'Program',
      phrases
    }
  }
}

module.exports = {
  Parser,
  parse: (input) => new Parser(new Lexer(input)).parse()
}