# Travyntra - Enterprise Travel Portal - Project Specifications

## 1. Project Overview
A state-of-the-art, responsive travel portal designed for enterprises to manage travel requests, approval workflows, expenses, and analytics. The platform connects companies with a travel agency (Admin) who fulfills these requests.

## 2. Technology Stack
- **Frontend**: Next.js (React), CSS Modules (Vanilla CSS for maximum control/customization).
- **Backend (API)**: Next.js API Routes / Server Actions.
- **Database**: PostgreSQL (via Prisma ORM recommended for type safety).
- **Storage**: AWS S3 (for documents/images).
- **Authentication**: NextAuth.js (or similar secure solution) supporting Role-Based Access Control (RBAC).

## 3. User Roles & Permissions

### A. Travel Agent (Super Admin)
- **Capabilities**:
    - View all requests from all onboarded companies.
    - Fulfill requests (book tickets, upload confirmations).
    - Manage document uploads/requests.
    - Communication thread per request (internal notes & external chat with company).
    - Create new Company accounts.
    - View Global Analytics.

### B. Company Admin
- **Capabilities**:
    - Manage company profile.
    - Manage Employees (Approve access for new signups).
    - Define internal approval workflows.
    - Approve/Reject employee travel requests before they are sent to the Travel Agent.
    - View Company-wide Analytics & Expenses.

### C. Employee
- **Capabilities**:
    - Register via Company Portal URL.
    - Submit Travel Requests.
    - Track Request Status.
    - View Travel History.
    - Upload necessary travel documents (Passport, Visa, etc.).

## 4. Implementation Plan

### Phase 1: Foundation & Setup [CURRENT]
- [x] Initialize Next.js Project (App Router).
- [x] Configure PostgreSQL Database Connection (Individual params in `.env`, dynamic URL construction).
- [x] Setup Prisma ORM (Schema design, Client Singleton in `src/lib/prisma.ts`).
- [x] Setup Basic Project Structure (Folders, Design Tokens in CSS, Utils).
- [x] Create `SPECS.md`.

### Phase 2: Design System & Layouts [CURRENT]
- [x] Define Global CSS Variables (Colors: Premium Palette, Typography: Inter/Outfit).
- [x] Create Reusable UI Components (Buttons, Cards, Inputs).
- [x] Create Modal Component (Dialog).
- [x] Implement Responsive Layout Wrappers (Sidebar, Header).
- [x] Create generic `DashboardShell` component.
- [ ] Create Dashboard Shells for each Role (Employee, Company, Admin).

### Phase 3: Authentication & RBAC [CURRENT]
- [x] Setup NextAuth.js (Credentials Provider, JWT).
- [x] Implement Login / Registration Flow (UI & API).
- [ ] Company Registration (by Admin only).
- [x] Employee Registration (Public URL associated with Company -> Pending Approval).
- [x] Role-based Middleware protection (Basic Auth Guard implemented).

### Phase 4: Core Features - Requests & Workflows
- [ ] Travel Request Form (Dynamic fields).
- [ ] Approval Workflow Engine (Employee -> [Company Approval] -> Agent).
- [ ] Request Status Tracking.

### Phase 5: Communication & Documents
- [ ] Implement Request-specific Chat/Thread.
- [ ] AWS S3 Integration for File Uploads.
- [ ] Document Management UI.

### Phase 6: Analytics & Reporting
- [ ] Admin Dashboard Charts.
- [ ] Company Expense Reports.
- [ ] History Tracking.

## 5. Security Standards
- Secure Session Management.
- Input Validation (Zod).
- Row Level Security (logic layer).
- Sanitized File Uploads.
- Encryption for sensitive data.

## 6. Future Tasks
- Email Notifications.
- Calendar Integration.
- Mobile App PWA.

---
**Status Log:**
- *2026-01-10*: Project initialization started. `SPECS.md` created.
