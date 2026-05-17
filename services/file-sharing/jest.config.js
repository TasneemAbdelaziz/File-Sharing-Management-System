module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/config/**',
        '!src/utils/logger.js'
    ],
    coverageDirectory: 'tests/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0
        }
    },
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true
};
