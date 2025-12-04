module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
    '^.+\\.js$': ['ts-jest'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(unified|unist-.*|remark-.*|mdast-.*|micromark.*|decode-named-character-reference|character-entities.*|bail|is-plain-obj|trough|vfile|vfile-message|ccount|escape-string-regexp|markdown-table|devlop|hastscript|hast-.*|html-void-elements|property-information|space-separated-tokens|comma-separated-tokens|web-namespaces|chalk|zwitch|stringify-entities|trim-lines|longest-streak|gemoji|chokidar|readdirp)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
