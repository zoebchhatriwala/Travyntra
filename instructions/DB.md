# Database Reference & Goals

## 1. Vision & Standards
Aligned with `SPECS.md`, the database must be:
- **Strictly Typed**: No arbitrary JSON without defined interfaces.
- **Enum-First**: State transitions backed by PostgreSQL Enums.
- **Multi-Tenant Secure**: RLS-like logic via Prisma middleware/wrappers (application level).
- **Audit-Ready**: Comprehensive activity logging.

## 2. Current Schema Status (As of Jan 16, 2026)
- **Engine**: PostgreSQL via Prisma
- **Key Models**: `Company`, `User`, `TripRequest`, `AgentBid`, `Invoice`.

### Discrepancies & Optimization Targets
| Model | Field | Issue | Action Plan |
|-------|-------|-------|-------------|
| `Expense` | `amount`, `currency` | Uses separate columns, diverging from `Money` JSON protocol? | Decide on unification strategy. `Decimal` is better for SQL, but consistency matters. |
| `Invoice` | `amount`, `currency` | Uses separate columns. | Standardize or document exception. |
| `TripRequest` | `budget`, `cost` | JSON fields. Need to ensure they typically contain `Money` structure. | Enforce via Application Logic/Zod. |
| `AgentBid` | `amount` | JSON field. | Enforce `Money` structure. |
| `User` | `tags` | String array. | Consider if `Tag` model is needed for consistency/search? (Low priority) |
| `ActivityLog` | `metadata` | JSON. | Ensure strict typing in app layer. |

## 3. Active Tasks

### 3.1. Cleanup & Strict Typing (Completed ✅)
- [x] **Enums Implementation**: Replace string literals with Enums for type safety.
    - `AgentBid.status` -> `enum BidStatus { PENDING, ACCEPTED, REJECTED, ARCHIVED }`
    - `WorkflowAction.action` -> `enum WorkflowActionType { REQUEST_CREATED, SUBMITTED, APPROVED_STEP, REJECTED, APPROVED, AUTO_APPROVED, CANCELLED }`
    - `Notification.type` -> `enum NotificationType { INFO, SUCCESS, WARNING, ERROR }`
    - `Expense.category` -> `enum ExpenseCategory { FLIGHT, HOTEL, TRAIN, MEALS, TRANSPORT, OTHER }`
- [x] **Documentation**: Add JSDoc-style comments (`///`) to all models and fields in `schema.prisma`.

### 3.2. Performance Optimization (Completed ✅)
- [x] **Indexing**: Add compound indexes for frequent query patterns.
    - `TripRequest`: `@@index([companyId, status])`, `@@index([userId, status])`
    - `Invoice`: `@@index([companyId, status])`, `@@index([agencyId, status])`
    - `Expense`: `@@index([requestId])`
    - `ActivityLog`: `@@index([companyId, createdAt])` for dashboard feeds.

### 3.3. Financial Data Architecture
- **Protocol**:
    - **Hard Financials** (Invoices/Expenses): Use Native SQL Types (`Decimal` + `String` Currency) for precise math and reporting.
    - **Soft Financials** (Budgets/Bids/Estimates): Use `Money` JSON object for flexibility and multi-currency presentation.
- **Action**: Ensure `Expense` and `Invoice` maintain `Decimal` types but are clearly documented.

## 4. Maintenance Log
- **2026-01-16**: Created `DB.md`.
- **2026-01-16**: Completed Strict Schema Cleanup.
    - Migrated Status/Type strings to Prisma Enums.
    - Updated `seed.ts` and `workflow-engine.ts` to use Enums.
    - Added Indices for performance.
    - Reset and Reseeded Database.
- **2026-01-16**: Schema Cleanup (Unused Fields).
    - Removed `User.tags` and `WorkflowStep.approverTags`.
    - Updated UI and Actions to reflect changes.
    - Verified functionality and reseeded.
- **2026-01-16**: Full Reset.
    - Deleted all migration history.
    - Dropped and recreated database.
    - Generated fresh `init` migration.
    - Reseeded database.
- **2026-01-16**: Enforced Strict Data Integrity.
    - Added `onDelete: Cascade` and `onDelete: SetNull` rules to all relations.
    - Ensures clean deletions of companies, users, and requests without orphaned data.
