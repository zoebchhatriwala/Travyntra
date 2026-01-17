# Testing & Quality Assurance Protocol

## 1. Objective
Achieve high confidence in the application's core logic through a multi-layered testing strategy. We prioritize correctness in financial calculations, workflow transitions, and multi-tenant data isolation.

## 2. Tools & Frameworks
- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Database**: Dedicated Test Database (PostgreSQL) or Prisma Mocking
- **Mocking**: `vitest-mock-extended` for Prisma and system services.

## 3. Core Testing Rules
- **No `any`**: Explicitly type all mocks and test data.
- **Data Isolation**: Each test must run in a clean state. Use `beforeEach` to reset database mocks or clear the test DB.
- **Factory Pattern**: Use `src/lib/test/factories.ts` to generate consistent mock objects (Users, Companies, Requests).
- **Timezone Awareness**: All date-related tests must explicitly set a timezone to avoid "it works on my machine" failures.
- **Zero Placeholders**: Tests must verify real outcomes, not just "call counts."

---

## 4. Testing Roadmap (To-Dos)

### Infrastructure & Setup
- [x] Install and configure Vitest with Next.js specific setup.
- [ ] Configure Playwright for E2E testing with authentication bypass.
- [x] Create `src/lib/test/factories.ts` for consistent test data.
- [x] Implement `PrismaClient` mocking utility.

### Unit Tests (Logic-First)
- [x] **Workflow Engine**:
    - [x] `startWorkflow`: Verify correct initial step assignment.
    - [x] `processApproval`: Test ANY vs ALL logic.
    - [x] `processApproval`: Verify auto-rejection on "REJECT".
    - [x] `revokeApproval`: Test status regression and record cleanup (via handleRequestUpdate).
- [x] **Policy Engine**:
    - [x] Budget rules (₹50k threshold).
    - [x] Regional rules (International vs Domestic).
    - [x] Combined rule assessment.
- [x] **Financials**:
    - [x] `moneyToDecimal` / `decimalToMoney` precision.
    - [x] Currency conversion with mock exchange rates.
    - [x] Invoice sum calculations including taxes.
- [ ] **Full Test Coverage**:
    - [ ] Achieve 100% coverage for `src/lib/workflow-engine.ts` (Current: 79%).
    - [ ] Achieve 100% coverage for `src/lib/auto-approval-engine.ts` (Current: 81%).
    - [ ] Achieve 100% coverage for `src/lib/utils/financials.ts` and `src/lib/utils/invoice.ts`.

### Integration Tests (Server Actions)
- [ ] **Request Creation**: Form data parsing -> DB persistence -> Workflow trigger.
- [x] **Bidding System**: Bid submission -> Notification -> Bid auto-approval.
- [x] **Fulfillment**: Item check -> Completion loop.
- [ ] **Multi-tenancy**: Verify User A cannot fetch Request B even with valid ID.

### E2E Paths (Critical User Stories)
- [ ] **The Happy Path**: Employee creates request -> Manager approves -> Agent bids -> Admin accepts -> Agent fulfills -> Invoice generated.
- [ ] **The Group Path**: Admin creates Group Trip -> Links multiple requests -> Bulk approves.
- [ ] **The Subscription Path**: Expired plan blocks request creation.

---

## 5. Completed Tests (Dones)
- [x] Unit tests for `WorkflowEngine`, `AutoApprovalEngine`, and `Financials` (32 tests total).
- [x] Integration tests for Approvals, Bidding, and Fulfillment server actions (11 tests total).
