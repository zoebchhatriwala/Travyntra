# Type Interface Centralization

The goal of this refactoring is to consolidate all interface definitions into the `src/types` directory, ensuring single source of truth and separating types from logic.

## Directory Structure

- `src/types/`
  - `common/`
    - `geo.ts` (Currency, Country)
    - `location.ts` (LocationItem, LocationDisplay)
    - `address.ts` (Address, PartialAddress)
    - `notification.ts` (Notification)
  - `finance/`
    - `money.ts` (Money)
    - `invoice.ts` (Invoice, Tax)
  - `request/`
    - `summary.ts` (TripRequestSummary)
    - `trip-preferences.ts` (TripPreferences, FlightPreference, etc.)
  - `workflow/`
    - `auto-approval-policy.ts` (AutoApprovalPolicy, AutoApprovalRule, etc.)
    - `step.ts` (WorkflowStepConfig, WorkflowProgressStep)
  - `user/`
    - `profile.ts` (UserProfile)
  - `workflow/`
    - `auto-approval-policy.ts` (AutoApprovalPolicy, AutoApprovalRule, etc.)
    - `step.ts` (WorkflowStepConfig, WorkflowProgressStep)

## Current Status

All major shared interfaces have been consolidated.

- [x] `Address` / `PartialAddress` -> `src/types/common/address.ts`.
- [x] `LocationItem` / `LocationDisplay` -> `src/types/common/location.ts`.
- [x] `Invoice` / `Tax` -> `src/types/finance/invoice.ts`.
- [x] `TripRequestSummary` -> `src/types/request/summary.ts`.
- [x] `Notification` -> `src/types/common/notification.ts`.
- [x] `Currency` / `Country` -> `src/types/common/geography.ts`.
- [x] `WorkflowStepConfig` / `WorkflowProgressStep` -> `src/types/workflow/step.ts`.
- [x] `UserProfile` -> `src/types/user/profile.ts`.
- [x] `Money` -> `src/types/finance/money.ts`.
- [x] `AutoApprovalPolicy` -> `src/types/workflow/auto-approval-policy.ts`.



## Guidelines

1.  **Definitions Only**: Files in `src/types` should only contain `interface`, `type`, or `enum` definitions. No functions or logic.
2.  **Implementation**: Logic related to these types (validation, formatting, calculation) lies in `src/lib/utils` or `src/lib/services`.
3.  **Imports**: Always update imports to point to the central `src/types` location.
