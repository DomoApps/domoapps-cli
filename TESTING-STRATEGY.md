# Testing Strategy Guide

This guide outlines the dual testing approach used throughout this codebase to enable safe refactoring and reliable development.

## Testing Philosophy

We use **two complementary test types** for each module:

1. **Interface/Contract Tests** - Test the "what" (refactor-safe)
2. **Integration Tests** - Test the "how" (implementation verification)

## Test File Naming Convention

```
src/util/mymodule.ts
├── tests/util/mymodule.interface.test.ts  # Interface/Contract tests
└── tests/util/mymodule.test.ts            # Integration tests
```

## Interface/Contract Tests

### Purpose
- Test public API contracts and interfaces
- Ensure consistent behavior during refactoring
- Fast feedback loop for development

### Characteristics
- **File suffix**: `.interface.test.ts`
- **Dependencies**: All external dependencies mocked
- **Focus**: Input/output contracts, return types, error handling
- **Speed**: Fast (no I/O, no external calls)
- **Stability**: High - should remain stable during refactoring

### What to Test
```typescript
describe('MyModule - Interface Tests (Refactor-Safe)', () => {
  // ✅ Function signatures and return types
  it('should return correct type for valid input', () => {
    const result = MyModule.someFunction(validInput);
    expect(typeof result).toBe('string');
  });

  // ✅ Error handling contracts
  it('should throw specific error for invalid input', () => {
    expect(() => MyModule.someFunction(invalidInput))
      .toThrow('Expected error message');
  });

  // ✅ Parameter validation
  it('should accept expected parameter types', () => {
    expect(() => MyModule.someFunction(param1, param2))
      .not.toThrow();
  });

  // ✅ Public API behavior (not implementation)
  it('should transform input to expected output format', () => {
    const result = MyModule.transform(input);
    expect(result).toHaveProperty('expectedProperty');
  });
});
```

### Setup Pattern
```typescript
import {MyModule} from '../../src/mymodule';
import {externalDep} from 'external-library';

// Mock all external dependencies
jest.mock('external-library');
jest.mock('fs-extra');
jest.mock('../../util/logger');

const mockExternalDep = externalDep as jest.Mocked<typeof externalDep>;

describe('MyModule - Interface Tests (Refactor-Safe)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // ... tests
});
```

## Integration Tests

### Purpose
- Test complete implementation with real dependencies
- Verify end-to-end functionality
- Catch integration issues and edge cases

### Characteristics
- **File suffix**: `.test.ts`
- **Dependencies**: Real dependencies (file system, network, etc.)
- **Focus**: Complete workflows, real-world scenarios
- **Speed**: Slower (I/O operations, setup/teardown)
- **Stability**: Lower - may need updates during implementation changes

### What to Test
```typescript
describe('MyModule - Integration Tests', () => {
  // ✅ Real file operations
  it('should create and modify actual files', async () => {
    await MyModule.createFile(testPath, content);
    const result = await fs.readFile(testPath, 'utf8');
    expect(result).toBe(expectedContent);
  });

  // ✅ End-to-end workflows
  it('should complete full workflow successfully', async () => {
    const result = await MyModule.completeWorkflow(input);
    // Verify side effects, file changes, external calls
  });

  // ✅ Edge cases with real data
  it('should handle complex real-world scenario', async () => {
    // Use actual files, network calls, etc.
  });
});
```

### Setup Pattern
```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import {MyModule} from '../../src/mymodule';

describe('MyModule - Integration Tests', () => {
  const testDir = path.join(__dirname, '../tmp');
  
  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });
  // ... tests
});
```

## Refactoring Workflow

### 1. Before Refactoring
```bash
# Run interface tests to understand current contracts
npm test -- **/*.interface.test.ts

# Document any failing tests - these define your constraints
```

### 2. During Refactoring
```bash
# Keep interface tests passing at all times
npm test -- **/*.interface.test.ts --watch

# These tests define what must NOT break
# Internal implementation can change freely
```

### 3. After Refactoring
```bash
# Update integration tests if implementation details changed
# Both test suites should pass
npm test

# Interface tests validate contracts
# Integration tests validate implementation
```

## Coverage Strategy

| Test Type | Purpose | Coverage Focus |
|-----------|---------|----------------|
| Interface | API Contracts | All public methods, error paths, parameter validation |
| Integration | Implementation | File operations, external integrations, complex workflows |

## Running Tests

### Development
```bash
# Fast feedback - interface tests only
npm test -- **/*.interface.test.ts

# Specific module interface tests
npm test -- tests/util/mymodule.interface.test.ts

# Watch mode for active development
npm test -- **/*.interface.test.ts --watch
```

### Pre-commit/CI
```bash
# Full test suite
npm test

# With coverage
npm run test:coverage
```

### Module-specific
```bash
# Both test types for a module
npm test -- tests/util/mymodule

# Just integration tests
npm test -- tests/util/mymodule.test.ts
```

## Benefits

### For Refactoring
- **Confidence**: Interface tests ensure API contracts are maintained
- **Speed**: Fast feedback loop with mocked dependencies
- **Guidance**: Clear specification of what behavior to preserve

### For Development
- **TDD**: Interface tests can be written first as specifications
- **Debugging**: Integration tests help identify real-world issues
- **Regression Prevention**: Both levels catch different types of bugs

### For Team Collaboration
- **Documentation**: Interface tests serve as executable documentation
- **Contracts**: Clear API boundaries between modules
- **Safe Changes**: Team members can refactor without breaking others' work

## Best Practices

### Interface Tests
- Mock ALL external dependencies
- Focus on public API only
- Test contracts, not implementation
- Keep tests simple and fast
- Use descriptive test names that explain the contract

### Integration Tests
- Use real dependencies when possible
- Test complete user workflows
- Include setup/teardown for resources
- Test edge cases with real data
- Document any external requirements

### Both
- Follow consistent naming conventions
- Use clear describe blocks to separate concerns
- Include both happy path and error scenarios
- Maintain tests alongside code changes
- Review test failures carefully - they might indicate breaking changes

## Examples

See `tests/util/manifest.interface.test.ts` and `tests/util/manifest.test.ts` for complete examples of this testing strategy in action.