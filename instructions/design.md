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
