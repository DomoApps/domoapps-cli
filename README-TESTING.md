# Testing Guide

This document describes the testing setup and practices for the Domo Apps CLI (Ryuu).

## Test Structure

The test suite is organized as follows:

```
tests/
├── setup.ts                    # Global test setup and teardown
├── fixtures/                   # Test data and sample files
│   └── test-manifest.json      # Sample manifest for testing
├── commands/                   # Command-specific tests
│   └── init.test.ts            # Tests for init command
├── util/                       # Utility function tests
│   ├── manifest.test.ts        # Manifest utility tests
│   └── BaseCommand.test.ts     # Base command class tests
└── integration/                # End-to-end integration tests
    └── cli.test.ts             # CLI integration tests
```

## Running Tests

### Available Test Scripts

- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode (reruns on file changes)  
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests in CI mode (no watch, with coverage)

### Test Coverage

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools

## Writing Tests

### Test Categories

1. **Unit Tests** (`tests/util/`, `tests/commands/`)
   - Test individual functions and classes in isolation
   - Use mocks for external dependencies
   - Focus on business logic and edge cases

2. **Integration Tests** (`tests/integration/`)
   - Test complete workflows and command execution
   - Use actual CLI binary when possible
   - Test file system interactions

### Testing Patterns

#### Mocking Dependencies
```typescript
jest.mock('fs-extra');
jest.mock('../../util/log');

const mockFs = fs as jest.Mocked<typeof fs>;
```

#### Testing Commands
```typescript
describe('command tests', () => {
  let program: Command;
  
  beforeEach(() => {
    program = new Command();
  });
  
  it('should register command correctly', () => {
    require('../../commands/mycommand')(program);
    
    const command = program.commands.find(cmd => cmd.name() === 'mycommand');
    expect(command).toBeDefined();
  });
});
```

#### File System Testing
- Use temporary directories in `tests/tmp/`
- Clean up after each test
- Use `fs-extra` for test file operations

#### Async Testing
```typescript
it('should handle async operations', async () => {
  await fs.writeJson(testFile, testData);
  const result = await functionUnderTest();
  expect(result).toBeDefined();
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up temporary files and reset mocks
3. **Descriptive Names**: Use clear, descriptive test and describe block names
4. **Edge Cases**: Test both happy path and error conditions
5. **Async/Await**: Use async/await for asynchronous operations
6. **Mocking**: Mock external dependencies to focus on unit being tested

## Continuous Integration

The test suite is designed to run in CI environments:
- Uses `test:ci` script for non-interactive execution
- Generates coverage reports in standard formats
- Includes timeout configurations for CI stability

## Troubleshooting

### Common Issues

1. **File Permission Errors**: Ensure test directories are writable
2. **Async Test Timeouts**: Increase timeout in Jest config if needed
3. **Mock Issues**: Clear mocks between tests with `jest.clearAllMocks()`
4. **Path Issues**: Use `path.join()` for cross-platform compatibility

### Debugging Tests

- Use `test.only()` to run single tests
- Add `console.log()` statements for debugging
- Use `--verbose` flag for detailed test output
- Check coverage reports to identify untested code paths