# Test Organization

This directory contains all tests for the travel portal application, organized by test type and module.

## Directory Structure

```
src/lib/test/
├── unit/                    # Unit tests for individual modules
│   ├── actions/            # Server action tests
│   │   ├── approvals-actions.test.ts
│   │   ├── bidding-actions.test.ts
│   │   ├── dashboard-actions.test.ts
│   │   └── fulfillment-actions.test.ts
│   ├── auth/               # Authentication tests
│   │   └── auth-options.test.ts
│   ├── utils/              # Utility function tests
│   │   ├── address.test.ts
│   │   ├── auto-approval-policy.test.ts
│   │   ├── export.test.ts
│   │   └── financials.test.ts
│   └── workflow/           # Workflow engine tests
│       ├── auto-approval-engine.test.ts
│       ├── workflow-engine.test.ts
│       └── workflow-engine-coverage.test.ts
├── integration/            # Integration tests
│   ├── approvals.test.ts
│   ├── bidding.test.ts
│   ├── create-request.test.ts
│   ├── fulfillment.test.ts
│   └── security.test.ts
├── helpers/                # Test helpers and utilities
│   ├── factories.ts        # Mock data factories
│   ├── prisma.ts          # Prisma mock setup
│   └── setup.ts           # Global test setup
└── README.md              # This file
```

## Test Categories

### Unit Tests (`unit/`)
Unit tests focus on testing individual functions, classes, or modules in isolation. They use mocks for external dependencies.

#### Actions (`unit/actions/`)
Tests for Next.js server actions that handle business logic:
- **approvals-actions.test.ts**: Tests for approval workflow actions
- **bidding-actions.test.ts**: Tests for bidding system actions
- **dashboard-actions.test.ts**: Tests for dashboard data fetching
- **fulfillment-actions.test.ts**: Tests for request fulfillment actions

#### Auth (`unit/auth/`)
Tests for authentication and authorization:
- **auth-options.test.ts**: Tests for NextAuth configuration and providers

#### Utils (`unit/utils/`)
Tests for utility functions:
- **address.test.ts**: Address parsing and validation
- **auto-approval-policy.test.ts**: Auto-approval policy utilities
- **export.test.ts**: Data export utilities
- **financials.test.ts**: Money handling, currency conversion, and invoice calculations

#### Workflow (`unit/workflow/`)
Tests for the workflow engine and approval system:
- **workflow-engine.test.ts**: Core workflow engine functionality
- **workflow-engine-coverage.test.ts**: Additional edge cases for 100% coverage
- **auto-approval-engine.test.ts**: Auto-approval rule evaluation

### Integration Tests (`integration/`)
Integration tests verify that multiple components work together correctly:
- **approvals.test.ts**: End-to-end approval workflows
- **bidding.test.ts**: Bidding system integration
- **create-request.test.ts**: Request creation flow
- **fulfillment.test.ts**: Fulfillment process integration
- **security.test.ts**: Multi-tenancy and access control

### Test Helpers (`helpers/`)
Shared utilities used across all tests:
- **factories.ts**: Factory functions for creating mock data objects
- **prisma.ts**: Prisma client mock configuration
- **setup.ts**: Global test setup (runs before all tests)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/lib/test/unit/workflow/workflow-engine.test.ts

# Run tests matching a pattern
npm test -- --grep "workflow"
```

## Writing Tests

### Naming Conventions
- Test files should end with `.test.ts`
- Test descriptions should be clear and descriptive
- Use `describe` blocks to group related tests
- Use `it` or `test` for individual test cases

### Best Practices
1. **Isolation**: Each test should be independent and not rely on other tests
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Mocking**: Use the helpers in `helpers/` for consistent mocking
4. **Coverage**: Aim for high coverage, especially for critical business logic
5. **Readability**: Write tests that serve as documentation for the code

### Using Test Helpers

```typescript
import { prismaMock } from '../../helpers/prisma';
import { createMockTripRequest, createMockUser } from '../../helpers/factories';

describe('My Feature', () => {
  beforeEach(() => {
    // Mocks are automatically reset in setup.ts
  });

  it('should do something', async () => {
    // Arrange
    const mockUser = createMockUser({ id: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    // Act
    const result = await myFunction();

    // Assert
    expect(result).toBeDefined();
  });
});
```

## Coverage Goals

The project maintains high test coverage for critical modules:
- **Workflow Engine**: 100% coverage ✓
- **Auto-Approval Engine**: 100% coverage ✓
- **Financial Utils**: 100% coverage ✓
- **Invoice Utils**: 100% coverage ✓

Overall project coverage target: >80%

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests
- Main branch merges

Failed tests will block merges to protect code quality.
