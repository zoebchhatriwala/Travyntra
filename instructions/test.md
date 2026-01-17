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
- [ ] Install and configure Vitest with Next.js specific setup.
- [ ] Configure Playwright for E2E testing with authentication bypass.
- [ ] Create `src/lib/test/factories.ts` for consistent test data.
- [ ] Implement `PrismaClient` mocking utility.

### Unit Tests (Logic-First)
- [ ] **Workflow Engine**:
    - [ ] `startWorkflow`: Verify correct initial step assignment.
    - [ ] `processApproval`: Test ANY vs ALL logic.
    - [ ] `processApproval`: Verify auto-rejection on "REJECT".
    - [ ] `revokeApproval`: Test status regression and record cleanup.
- [ ] **Policy Engine**:
    - [ ] Budget rules (₹50k threshold).
    - [ ] Regional rules (International vs Domestic).
    - [ ] Combined rule assessment.
- [ ] **Financials**:
    - [ ] `moneyToDecimal` / `decimalToMoney` precision.
    - [ ] Currency conversion with mock exchange rates.
    - [ ] Invoice sum calculations including taxes.

### Integration Tests (Server Actions)
- [ ] **Request Creation**: Form data parsing -> DB persistence -> Workflow trigger.
- [ ] **Bidding System**: Bid submission -> Notification -> Bid approval.
- [ ] **Fulfillment**: Item check -> Document upload -> Completion loop.
- [ ] **Multi-tenancy**: Verify User A cannot fetch Request B even with valid ID.

### E2E Paths (Critical User Stories)
- [ ] **The Happy Path**: Employee creates request -> Manager approves -> Agent bids -> Admin accepts -> Agent fulfills -> Invoice generated.
- [ ] **The Group Path**: Admin creates Group Trip -> Links multiple requests -> Bulk approves.
- [ ] **The Subscription Path**: Expired plan blocks request creation.

---

## 5. Completed Tests (Dones)
- [ ] *None yet. Ready to begin Phase 10.5.*
