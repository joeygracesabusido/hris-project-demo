const config = require('eslint-config-next')

module.exports = [
  ...config,
  {
    ignores: ['scratch*.js', 'test_prisma.js'],
  },
]
