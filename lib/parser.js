'use strict'

const { Lexer, TokenType } = require('./lexer.js')

class Parser {
  constructor(lexer) {
    this.lexer = lexer
    this.currentToken = this.lexer.getNextToken()
  }

  error(token, position) {
    throw new Error(`Unexpected token \`${token}\` at position ${position}`)
  }

  eat(tokenType) {
    if (this.currentToken.type === tokenType) {
      const token = this.currentToken
      this.currentToken = this.lexer.getNextToken()
      return token
    }
    this.error(this.currentToken.value || this.currentToken.type, this.currentToken.position)
  }

  parsePhrase() {
    const segments = []

    if (this.currentToken.type === TokenType.DOT) {
      this.error('.', 0)
    }

    while (this.currentToken.type !== TokenType.SEMICOLON && 
           this.currentToken.type !== TokenType.EOF) {
      
      if (this.currentToken.type === TokenType.DOT) {
        this.eat(TokenType.DOT)
        continue
      }

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
          if (this.currentToken.type !== TokenType.SEMICOLON && 
              this.currentToken.type !== TokenType.EOF) {
            this.error('$', 3)
          }
          return {
            type: 'Phrase',
            segments: [
              ...segments,
              { type: 'InputReference', position: dollarPos }
            ]
          }
        }
      }

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
            this.error(this.currentToken.value || this.currentToken.type, this.currentToken.position)
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

        // Handle hash after identifier
        if (this.currentToken.type === TokenType.HASH) {
          this.error('#', 3)
        }
        continue
      }

      if (this.currentToken.type === TokenType.HASH) {
        const hashPos = this.currentToken.position
        this.eat(TokenType.HASH)
        if (this.currentToken.type !== TokenType.IDENTIFIER) {
          this.error(this.currentToken.value || this.currentToken.type, this.currentToken.position)
        }
        const propertyToken = this.eat(TokenType.IDENTIFIER)
        segments.push({
          type: 'PropertyAccess',
          property: propertyToken.value,
          position: hashPos
        })
        continue
      }

      this.error(this.currentToken.value || this.currentToken.type, this.currentToken.position)
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

      this.error(this.currentToken.value || this.currentToken.type, this.currentToken.position)
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