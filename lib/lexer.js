'use strict'

const TokenType = {
  DOT: 'DOT', // .
  DOLLAR: 'DOLLAR', // $
  ARROW: 'ARROW', // >
  HASH: 'HASH', // #
  COLON: 'COLON', // :
  SEMICOLON: 'SEMICOLON', // ;
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  EOF: 'EOF'
}

class Token {
  constructor (type, value, position) {
    this.type = type
    this.value = value
    this.position = position
  }
}

class Lexer {
  constructor (input) {
    this.input = input
    this.position = 0
    this.charPosition = 0 // Track actual character position including whitespace
    this.currentChar = this.input[0]
  }

  error () {
    throw new Error(`Invalid character '${this.currentChar}' at position ${this.charPosition}`)
  }

  advance () {
    this.position++
    this.charPosition++
    if (this.position > this.input.length - 1) {
      this.currentChar = null
    } else {
      this.currentChar = this.input[this.position]
    }
  }

  peekNext () {
    const peekPos = this.position + 1
    if (peekPos > this.input.length - 1) {
      return null
    }
    return this.input[peekPos]
  }

  skipWhitespace () {
    while (this.currentChar && this.currentChar.trim() === '') {
      this.advance()
    }
  }

  number () {
    const startPos = this.charPosition
    let result = ''
    let hasDot = false

    while (this.currentChar && (this.isDigit(this.currentChar) || this.currentChar === '.')) {
      if (this.currentChar === '.') {
        if (hasDot) {
          break
        }
        hasDot = true
      }
      result += this.currentChar
      this.advance()
    }

    return new Token(TokenType.NUMBER, parseFloat(result), startPos)
  }

  identifier () {
    const startPos = this.charPosition
    let result = ''

    while (this.currentChar && this.isAlphaNumeric(this.currentChar)) {
      result += this.currentChar
      this.advance()
    }

    return new Token(TokenType.IDENTIFIER, result, startPos)
  }

  isDigit (char) {
    return char >= '0' && char <= '9'
  }

  isAlpha (char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
  }

  isAlphaNumeric (char) {
    return this.isAlpha(char) || this.isDigit(char)
  }

  getNextToken () {
    while (this.currentChar !== null) {
      if (this.currentChar.trim() === '') {
        this.skipWhitespace()
        continue
      }

      const currentPos = this.charPosition

      if (this.isDigit(this.currentChar)) {
        return this.number()
      }

      if (this.isAlpha(this.currentChar)) {
        return this.identifier()
      }

      switch (this.currentChar) {
        case '.':
          this.advance()
          return new Token(TokenType.DOT, '.', currentPos)
        case '$':
          this.advance()
          return new Token(TokenType.DOLLAR, '$', currentPos)
        case '>':
          this.advance()
          return new Token(TokenType.ARROW, '>', currentPos)
        case '#':
          this.advance()
          return new Token(TokenType.HASH, '#', currentPos)
        case ':':
          this.advance()
          return new Token(TokenType.COLON, ':', currentPos)
        case ';':
          this.advance()
          return new Token(TokenType.SEMICOLON, ';', currentPos)
        default:
          this.error()
      }
    }

    return new Token(TokenType.EOF, null, this.charPosition)
  }

  tokenize () {
    const tokens = []
    let token = this.getNextToken()

    while (token.type !== TokenType.EOF) {
      tokens.push(token)
      token = this.getNextToken()
    }

    tokens.push(token)
    return tokens
  }
}

module.exports = {
  Lexer,
  Token,
  TokenType
}
