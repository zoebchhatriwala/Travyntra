# Accessibility Compliance (WCAG 2.2 AA)

## Compliance Statement
The platform must comply with **WCAG 2.2 AA**. WCAG is the only accessibility standard used for compliance, validation, audits, and approval.

## Authority
All accessibility decisions, requirements, and validations are based on WCAG.
`instructions/SPECS.md` and `instructions/*.md` must be interpreted and implemented in a way that meets WCAG requirements.
If there is ambiguity, WCAG takes precedence for accessibility compliance.

## Compliance Scope
Every user-facing UI and output must comply with WCAG.
This includes but is not limited to:
- Web UI (App Router pages)
- Admin UI & Dashboards
- Billing pages & Invoices
- Emails & Notifications
- PDFs & Exported files
- System messages

## Compliance Rules
1. **Definition of Done**: No feature is considered complete unless it meets WCAG requirements.
2. **Release Blocker**: No UI is allowed to ship if it fails WCAG compliance checks.
3. **Non-negotiable**: Accessibility compliance is not optional or best-effort; it is a requirement.

## Verification
WCAG compliance must be verified through:
- Automated testing (e.g., axe-core)
- Manual keyboard testing (Tab navigation, Focus indicators)
- Screen reader testing (VoiceOver/TalkBack/NVDA)

Failure in any WCAG check blocks release until resolved.

## Tracking
All WCAG-related requirements, tasks, and statuses must be tracked here. Each tracked item must map to a WCAG success criterion directly or indirectly and reference `instructions/SPECS.md` or `instructions/*.md`.

| ID | Feature / Component | WCAG Criterion | Source Ref | Status | Notes |
|----|---------------------|----------------|------------|--------|-------|
| 001 | Global Design System | [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | `instructions/design.md` | **FIXED** | Updated `globals.css`: `on-secondary` is Slate 900, `error` is Red 600. |
| 002 | Global Focus Indicators | [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) | `instructions/design.md` | **PASS** | Updated `Input`, `Textarea` to use `ring-2` focus style, matching `Button` and `Select`. |
| 003 | Navigation & Menus | [2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) | `instructions/design.md` | **FIXED** | Added `aria-label` to sidebar toggle buttons and brand link in `sidebar-layout.tsx`. |
| 004 | Forms & Inputs | [3.3.2 Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html) | `instructions/design.md` | **FIXED** | Added proper `Label` and `aria-label` to Staff List, Requests Table, and fixed nesting in Request Form. |
| 005 | Modal Dialogs | [2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html) | `instructions/design.md` | **PASS** | `Dialog` component uses `@radix-ui` primitives which handle focus trapping and ESC key correctly. |
| 006 | Images & Assets | [1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html) | `instructions/SPECS.md` | **PASS** | Reviewed avatar usage; empty `alt` tags correctly used where text labels are adjacent. |
| 007 | Color Usage | [1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | `instructions/design.md` | **PASS** | `Badge` component uses text labels + high contrast colors (7:1+ for most). |

## Persistence
This file (`instructions/accessibility.md`) is the persistent compliance document. It must always reflect the current WCAG compliance state so work can resume in any new session without loss of context.
