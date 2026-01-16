# Design System: Travyntra (Corporate Joy)

This document outlines the design system for Travyntra, following **Google's Material Design 3 (Material You)** principles, adapted for the "Corporate Joy" aesthetic defined in `SPECS.md`.

## 1. Design Philosophy
- **Theme**: Strictly Light Mode.
- **Vibe**: "Corporate Joy" — Premium, reliable, warm, collaborative.
- **Characteristics**: Large border radii, subtle glassmorphism, generous white space, pastel backgrounds with vibrant accents.

---

## 2. Design Tokens
All tokens should be implemented as CSS Variables in `src/app/globals.css`.

### A. Color Palette
We use the Material Design 3 semantics (Primary, Secondary, Tertiary, Surface, etc.).

| Token Name | Role | Hex Code / value | Description |
|:---|:---|:---|:---|
| **Primary** |
| `--md-sys-color-primary` | Main actions, active states | `#4338CA` (Indigo 700) | Vivid Cobalt |
| `--md-sys-color-on-primary` | Text on primary | `#FFFFFF` | White |
| `--md-sys-color-primary-container` | Lower emphasis fills | `#E0E7FF` (Indigo 100) | Soft Sky Blue |
| `--md-sys-color-on-primary-container` | Text on primary container | `#312E81` (Indigo 900) | Deep Indigo |
| **Secondary** |
| `--md-sys-color-secondary` | Less prominent actions | `#F59E0B` (Amber 500) | Warm Amber |
| `--md-sys-color-on-secondary` | Text on secondary | `#FFFFFF` | White |
| `--md-sys-color-secondary-container` | Secondary fills | `#FEF3C7` (Amber 100) | Soft Amber |
| `--md-sys-color-on-secondary-container` | Text on secondary container | `#78350F` (Amber 900) | Deep Amber |
| **Tertiary** |
| `--md-sys-color-tertiary` | Accents, playful elements | `#10B981` (Emerald 500) | Friendly Mint |
| `--md-sys-color-on-tertiary` | Text on tertiary | `#FFFFFF` | White |
| `--md-sys-color-tertiary-container` | Tertiary fills | `#D1FAE5` (Emerald 100) | Soft Mint |
| `--md-sys-color-on-tertiary-container` | Text on tertiary container | `#064E3B` (Emerald 900) | Deep Mint |
| **Backgrounds & Surfaces** |
| `--md-sys-color-background` | Page background | `#F8FAFC` (Slate 50) | Airy White/Grey |
| `--md-sys-color-on-background` | Text on background | `#0F172A` (Slate 900) | Deep Charcoal |
| `--md-sys-color-surface` | Cards, Sheets | `#FFFFFF` | Pure White |
| `--md-sys-color-on-surface` | Text on surface | `#1E293B` (Slate 800) | Charcoal |
| `--md-sys-color-surface-variant` | Dividers, Borders | `#E2E8F0` (Slate 200) | Neutral Border |
| `--md-sys-color-on-surface-variant` | Icons, secondary text | `#64748B` (Slate 500) | Muted Grey |
| **Error** |
| `--md-sys-color-error` | Critical actions/errors | `#EF4444` (Red 500) | Standard Red |
| `--md-sys-color-on-error` | Text on error | `#FFFFFF` | White |

### B. Typography
Font Families:
- **Display/Headings**: `Outfit` (Friendly, Geometric)
- **Body/UI**: `Inter` (Clean, Legible)

| Token Name | Size | Line Height | Weight | Usage |
|:---|:---|:---|:---|:---|
| `--md-sys-typescale-display-large` | 57px | 64px | 400 | Hero sections |
| `--md-sys-typescale-headline-large` | 32px | 40px | 600 | Page titles |
| `--md-sys-typescale-title-medium` | 16px | 24px | 500 | Card titles |
| `--md-sys-typescale-body-large` | 16px | 24px | 400 | Main content |
| `--md-sys-typescale-body-medium` | 14px | 20px | 400 | Secondary content |
| `--md-sys-typescale-label-large` | 14px | 20px | 500 | Buttons |

### C. Spacing & Margins (4px Baseline)
| Token | Value | usage |
|:---|:---|:---|
| `--spacing-xs` | 4px | Tight elements |
| `--spacing-sm` | 8px | Related elements |
| `--spacing-md` | 16px | Internal card padding |
| `--spacing-lg` | 24px | Section separation |
| `--spacing-xl` | 32px | Major layout gaps |
| `--spacing-2xl` | 48px | Page margins |

### D. Shapes (Border Radius)
"Large border radii (soft corners)" alignment with Material Design 3.

| Token | CSS Variable | Tailind Utility | Value | Usage |
|:---|:---|:---|:---|:---|
| **Extra Small** | `--md-sys-shape-corner-xs` | `rounded-corner-xs` | 4px | Small inputs, tags |
| **Small** | `--md-sys-shape-corner-sm` | `rounded-corner-sm` | 8px | Default for legacy `rounded-lg`, `rounded-md` |
| **Medium** | `--md-sys-shape-corner-md` | `rounded-corner-md` | 12px | Standard for legacy `rounded-xl` |
| **Large** | `--md-sys-shape-corner-lg` | `rounded-corner-lg` | 16px | Large cards for legacy `rounded-2xl` |
| **Extra Large** | `--md-sys-shape-corner-xl` | `rounded-corner-xl` | 28px/32px | Primary buttons, Hero cards for legacy `rounded-3xl` |
| **Full** | `--md-sys-shape-corner-full` | `rounded-full` | 9999px | Avatars, pills |

#### Migration Strategy
- `rounded-lg` → `rounded-corner-sm` (8px is standard for Material Design small corners)
- `rounded-md` → `rounded-corner-sm` (Often used for inputs and cards that should be sleek)
- `rounded-xl` → `rounded-corner-md` (Standard card radius)
- `rounded-2xl` → `rounded-corner-lg` (Large containers)
- `rounded-3xl` or `rounded-[32px]` → `rounded-corner-xl` (Maximum rounding for primary UI blocks)

### E. Execution: "Corporate Joy" Effects
- **Glassmorphism**: `.glass` class
  - `background: rgba(255, 255, 255, 0.7)`
  - `backdrop-filter: blur(12px)`
  - `border: 1px solid rgba(255, 255, 255, 0.5)`
- **Shadows**: Soft, multi-layer shadows using colorful tints.
  - `--shadow-joy`: `0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06)`

---

## 3. Component Guidelines

### Buttons (`Button.tsx`)
1. **Filled (Primary)**:
   - Bg: `--md-sys-color-primary`
   - Text: `--md-sys-color-on-primary`
   - Radius: `--md-sys-shape-corner-xl` (Pill shape preferred for primary actions)
   - Height: 40px (Standard)
   - Padding: 0 24px
2. **Tonal (Secondary)**:
   - Bg: `--md-sys-color-secondary-container`
   - Text: `--md-sys-color-on-secondary-container`
3. **Outlined**:
   - Border: 1px solid `--md-sys-color-outline`
   - Text: `--md-sys-color-primary`
4. **Text**:
   - Background: Transparent
   - Text: `--md-sys-color-primary` (Hover: bg-primary/10)

### Inputs (`Input.tsx`)
- **Style**: Material Design Outlined Text Field
- **Height**: 56px (Comfortable touch target)
- **Radius**: `--md-sys-shape-corner-sm` (4px to 8px)
- **Border**: 1px solid `--md-sys-color-outline`
- **Focus**: Border 2px solid `--md-sys-color-primary`
- **Label**: Floating label behavior (optional) or top-aligned sleek label.

---

## 4. Implementation Plan
List of files to modify to implement this design system.

- [x] **`src/app/globals.css`**
    - [x] Remove old Shadcn/Tailwind base colors if conflicting.
    - [x] Add all `--md-sys-*` variables defined above.
    - [x] Update utility classes to refer to new variables.

- [x] **`tailwind.config.ts`**
    - [x] Map `colors` to the new `--md-sys-*` variables.
    - [x] Map `borderRadius` to new shape tokens.

- [x] **`src/components/ui/button.tsx`**
    - [x] Update button variants to use new tokens.
    - [x] Enforce pill shape for primary variants if requested.

- [x] **`src/components/ui/input.tsx`**
    - [x] Increase height/padding to match MD3 guidelines.
    - [x] Update border and focus states.

- [x] **`src/components/ui/card.tsx`**
    - [x] Update background to `surface` or `surface-container`.
    - [x] Increase border-radius to `lg` or `xl`.
    - [x] Remove hard borders if using elevation/shadows.

- [x] **`src/app/layout.tsx`**
    - [x] Ensure font variables (`Inter`, `Outfit`) are correctly set up and applied.

- [x] **Input & Field Refinement (Standardization)**
    - [x] Standardized `bg-slate-50/50` for `Input`, `Select`, and `Textarea` base components.
    - [x] Implemented `focus:bg-white` and `focus:ring-0` behavior for a unified editing experience.
    - [x] Removed legacy hardcoded background/border overrides from authentication and dashboard forms.

- [x] **Bulk Radii Migration**
    - [x] Converted all legacy `rounded-lg`, `rounded-md`, `rounded-xl`, and `rounded-3xl` instances to `rounded-corner-*` tokens.
    - [x] Standardized buttons and tags to `rounded-corner-sm` or `rounded-corner-md`.
    - [x] Standardized cards and major containers to `rounded-corner-xl`.

---

## 5. Recent Standardizations (Corporate Joy Refinement)

### A. Unified Field Styling
To maintain the "Corporate Joy" aesthetic, all data-entry fields follow these rules:
- **Resting State**: `bg-slate-50/50` with a subtle 1px border.
- **Focus State**: `bg-white` with a defined primary border, removing generic box shadows.
- **Corner Radius**: Strictly `rounded-corner-sm` (8px) for inputs and selects.

### B. Final Radii Mapping
| Legacy Class | MD3 Token | CSS Variable | Value | Usage |
|:---|:---|:---|:---|:---|
| `rounded-lg` / `md` | `rounded-corner-sm` | `--md-sys-shape-corner-sm` | 8px | Standard inputs, small buttons, tags |
| `rounded-xl` | `rounded-corner-md` | `--md-sys-shape-corner-md` | 12px | Action buttons, secondary containers |
| `rounded-2xl` | `rounded-corner-lg` | `--md-sys-shape-corner-lg` | 16px | Informational cards, profile images |
### C. Spacing Standardization (8dp Grid)
All UI layouts are now strictly aligned to an 8dp (8px) grid system to ensure professional rhythm and visual balance:
- **Base Unit**: 4px (Tailwind unit 1).
- **Core Multiplier**: 8px (Tailwind unit 2, 4, 6, 8, etc.).
- **Standard Paddings**: Major cards use `p-6` (24px) or `p-8` (32px).
- **Common Gaps**: Component gaps have been standardized to `gap-4` (16px) or `gap-6` (24px).
- **Inconsistencies Fixed**: Legacy `p-5`, `gap-3`, and `mb-5` instances have been migrated to the nearest 8dp equivalent.

---

## 6. Material Design 3 Component Migration

### A. Badge System (`badge.tsx`)
Migrated from custom "Corporate Joy" pill badges to Material Design 3 container-based badges.

#### Design Specifications
- **Corner Radius**: `rounded-lg` (8dp) - MD3 standard for small containers
- **Typography**: `text-xs font-semibold` (12px, 600 weight) - MD3 label medium
- **Text Case**: Title case (e.g., "Pending Agent Action") instead of ALL CAPS
- **Padding**: `px-3 py-1` (12px horizontal, 4px vertical)
- **Borders**: Subtle borders for definition (`border-{color}-100`)

#### Color Palette (MD3 Aligned)
| Variant | Background | Text | Border | Usage |
|:---|:---|:---|:---|:---|
| `success` | `green-50` | `green-700` | `green-100` | Completed, Approved, Paid, Active |
| `warning` | `orange-50` | `orange-700` | `orange-100` | Pending, Waiting, In Progress |
| `destructive` | `red-50` | `red-700` | `red-100` | Rejected, Failed, Cancelled, Overdue, Blocked |
| `info` | `blue-50` | `blue-700` | `blue-100` | Informational states |
| `pending` | `sky-50` | `sky-700` | `sky-100` | Alternative pending state |
| `violet` | `purple-50` | `purple-700` | `purple-100` | Booked, Shipped |
| `outline` | `background` | `foreground` | `input` | Draft, Archived |

#### Status Mapping (`getStatusColor` utility)
Centralized status-to-variant mapping in `src/lib/utils.ts`:
- **Success**: COMPLETED, APPROVED, ACCEPTED, PAID, ACTIVE, SUCCESS
- **Destructive**: REJECTED, FAILED, CANCELLED, VOID, OVERDUE, INACTIVE, ERROR, BLOCKED
- **Warning**: PENDING, PENDING_COMPANY_APPROVAL, PENDING_AGENT_ACTION, WAITING, IN_PROGRESS
- **Violet**: BOOKED, SHIPPED
- **Outline**: DRAFT, ARCHIVED

### B. Approval Actions Banner
Updated to MD3 surface container specifications.

#### Before (Corporate Joy)
- Gradient backgrounds (`from-amber-50 to-orange-50`)
- Rounded-3xl corners (24dp)
- Gradient buttons with heavy shadows
- Font-black typography (900 weight)
- ALL CAPS text

#### After (MD3)
- Solid surface container (`bg-orange-50`)
- Rounded-xl corners (16dp)
- Solid color buttons (`bg-green-600`, `border-gray-300`)
- Font-semibold typography (600 weight)
- Title case text
- Subtle borders (`border-orange-200`)
- Compact spacing (`h-11` buttons, `p-6` container)

### C. Dropdown Menus
Fully aligned with MD3 menu specifications.

#### Design Specifications
- **Menu Container**: 
  - Corner radius: `rounded-lg` (12dp)
  - Padding: `p-1` (4px)
  - Border: `border-gray-200`
  - Shadow: `shadow-lg`
  - Width: `w-48` (192px)

- **Menu Items**:
  - Corner radius: `rounded-md` (6dp)
  - Padding: `px-3 py-2` (12px/8px)
  - Typography: `text-sm` regular weight (14px)
  - Icon size: `18px`
  - No icon backgrounds (icons directly next to text)
  - Hover states: `hover:bg-gray-100`, `hover:bg-{color}-50`

- **Separators**:
  - Margin: `my-1` (4px)
  - Color: `bg-gray-100`

### D. Dialog Components
Updated to MD3 dialog specifications.

#### Design Specifications
- **Container**: `rounded-xl` (16dp)
- **Title**: `text-xl font-semibold` (20px, 600 weight)
- **Buttons**: 
  - Corner radius: `rounded-lg` (8dp)
  - Typography: `font-medium` (500 weight)
  - Solid colors (no gradients)
- **Input Fields**: `rounded-lg` (8dp)
- **Content Containers**: `rounded-lg` with `bg-gray-50`

### E. Components Updated
The following components were migrated to MD3:

1. **Badge Component** (`src/components/ui/badge.tsx`)
2. **Approval Actions** (`src/components/workflow/approval-actions.tsx`)
3. **Request Actions Dropdown** (`src/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/request-actions.tsx`)
4. **Request Header** (`src/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/request-header.tsx`)
5. **Request Layout** (`src/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/layout.tsx`)
6. **Requests Table** (`src/app/company/[slug]/(dashboard)/admin/requests/_components/requests-table.tsx`)
7. **Bid List** (`src/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/bid-list.tsx`)
8. **Fulfillment Pages** (`src/app/agent/fulfillment/page.tsx`, `src/app/agent/fulfillment/[requestId]/page.tsx`)
9. **Integrations Page** (`src/app/company/[slug]/(dashboard)/admin/integrations/page.tsx`)
10. **Admin Dashboard** (`src/app/admin/dashboard/page.tsx`)
11. **Company Admin Dashboard** (`src/app/company/[slug]/(dashboard)/admin/page.tsx`)
12. **Employee Dashboard** (`src/app/company/[slug]/(dashboard)/dashboard/page.tsx`)
13. **Staff List** (`src/app/company/[slug]/(dashboard)/admin/staff/_components/staff-list.tsx`)
14. **Invoice List** (`src/app/agent/invoices/_components/invoice-list.tsx`)
15. **Agent Bid Detail** (`src/app/agent/bids/[requestId]/page.tsx`)

### F. Utility Functions
Created centralized utilities for consistent status handling:

- **`getStatusColor(status: string)`**: Maps status strings to badge variants
- **`formatStatus(status: string)`**: Converts status strings to title case (e.g., "PENDING_AGENT_ACTION" → "Pending Agent Action")

### G. Migration Benefits
1. **Consistency**: All status indicators use the same visual language
2. **Accessibility**: Better contrast ratios and touch targets
3. **Maintainability**: Centralized styling logic
4. **Modern Design**: Follows latest Material Design 3 guidelines
5. **Cleaner UI**: Removed excessive gradients and rounded corners
6. **Better Typography**: More readable with title case and proper weights

---

## 7. Design Principles Summary

### Material Design 3 Alignment
- **Corner Radii**: 6dp (rounded-md), 8dp (rounded-lg), 12dp (rounded-lg for menus), 16dp (rounded-xl)
- **Typography**: Semibold for headings (600), Medium for body (500), Regular for menu items (400)
- **Colors**: MD3 palette (orange, green, red, blue, purple) with proper tints
- **Spacing**: 8dp grid system with compact, purposeful spacing
- **Containers**: Surface-based design with subtle borders and shadows
- **Buttons**: Solid colors with proper elevation, no gradients
- **Text**: Title case for better readability, no ALL CAPS

### Corporate Joy Integration
While following MD3 specifications, we maintain "Corporate Joy" through:
- **Warm color palette**: Orange for warnings, green for success
- **Generous spacing**: Proper breathing room in layouts
- **Subtle effects**: Soft shadows and borders for depth
- **Premium feel**: High-quality typography and refined details
- **Collaborative vibe**: Clear, friendly interface elements
