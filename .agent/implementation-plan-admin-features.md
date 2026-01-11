# Implementation Plan: Admin Dashboard, Collaborators & Notifications

## Overview
This document outlines the implementation of:
1. Company Admin Request Dashboard
2. Collaborators System (auto-add on @mention)
3. Notification System
4. Approval Workflow UI
5. Group Trip Support

## Database Changes ✅ COMPLETED
- Added `collaborators` relation to TripRequest
- Added `parentTripId` and child/parent trip relations
- Added `collaboratingRequests` to User model
- Migration applied successfully

## Phase 1: Collaborators System

### 1.1 Auto-Add Collaborators on Mention
**File**: `src/app/company/[slug]/(dashboard)/dashboard/actions.ts`

```typescript
export async function addCollaboratorOnMention(requestId: string, mentionedUserName: string) {
  // Find user by name
  // Add to request collaborators if not already added
  // Create notification for the mentioned user
}
```

### 1.2 Update postTripMessage Action
- Parse message content for @mentions
- Extract mentioned usernames
- Call addCollaboratorOnMention for each mention
- Create notifications

### 1.3 Update getTripRequest Security
- Allow access if user is:
  - Request creator
  - Collaborator
  - Approver in workflow
  - Company admin

## Phase 2: Notification System

### 2.1 Create Notification Actions
**File**: `src/app/company/[slug]/(dashboard)/dashboard/notifications/actions.ts`

```typescript
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
})

export async function getNotifications(userId: string)
export async function markAsRead(notificationId: string)
export async function markAllAsRead(userId: string)
```

### 2.2 Notification Triggers
- Request status change → Notify creator + collaborators
- New message → Notify all collaborators
- @Mention → Notify mentioned user
- Approval required → Notify approvers
- Approval action → Notify creator

### 2.3 Notification Bell Component
**File**: `src/app/company/[slug]/(dashboard)/dashboard/_components/notification-bell.tsx`
- Real-time notification count
- Dropdown with recent notifications
- Mark as read functionality
- Link to full notification center

## Phase 3: Admin Request Dashboard

### 3.1 Admin Requests Page
**File**: `src/app/company/[slug]/(dashboard)/admin/requests/page.tsx`

Features:
- List all company requests
- Filters: status, employee, date range, destination
- Search by title/destination
- Pagination
- Bulk actions (approve, reject)
- Export to CSV

### 3.2 Admin Request Actions
**File**: `src/app/company/[slug]/(dashboard)/admin/requests/actions.ts`

```typescript
export async function getAllCompanyRequests(filters)
export async function bulkApproveRequests(requestIds: string[])
export async function bulkRejectRequests(requestIds: string[])
export async function exportRequests(filters)
```

### 3.3 Request Analytics Widget
- Total requests this month
- Pending approvals count
- Average approval time
- Top destinations
- Budget trends

## Phase 4: Approval Workflow UI

### 4.1 Approval Steps Component
**File**: `src/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/approval-steps.tsx`

- Visual timeline of approval steps
- Show current step
- Display approvers for each step
- Show approval status (pending/approved/rejected)
- Allow approvers to approve/reject

### 4.2 Approval Actions
```typescript
export async function approveRequest(requestId: string, stepId: string)
export async function rejectRequest(requestId: string, stepId: string, reason: string)
export async function getMyPendingApprovals()
```

### 4.3 My Approvals Page
**File**: `src/app/company/[slug]/(dashboard)/dashboard/approvals/page.tsx`
- List requests pending user's approval
- Quick approve/reject actions
- Filter by urgency/date

## Phase 5: Group Trip Support

### 5.1 Create Group Trip
**File**: `src/app/company/[slug]/(dashboard)/dashboard/trips/new/page.tsx`
- Form to create parent trip
- Add participants
- Set common details (dates, destination, purpose)

### 5.2 Link Request to Group Trip
- Dropdown in request form to select parent trip
- Show linked requests in parent trip view
- Consolidated approval for group trips

### 5.3 Group Trip Dashboard
**File**: `src/app/company/[slug]/(dashboard)/dashboard/trips/[tripId]/page.tsx`
- Overview of all linked requests
- Participant list
- Consolidated budget
- Bulk actions

## Implementation Priority

### High Priority (Implement First)
1. ✅ Database schema updates
2. Notification system (core infrastructure)
3. Auto-add collaborators on mention
4. Admin request dashboard
5. Approval workflow UI

### Medium Priority
1. Notification bell component
2. My Approvals page
3. Request analytics

### Low Priority (Future Enhancement)
1. Group trip creation
2. Group trip dashboard
3. Email digests
4. Advanced analytics

## Files to Create/Modify

### New Files
- `src/app/company/[slug]/(dashboard)/dashboard/notifications/actions.ts`
- `src/app/company/[slug]/(dashboard)/dashboard/notifications/page.tsx`
- `src/app/company/[slug]/(dashboard)/admin/requests/page.tsx`
- `src/app/company/[slug]/(dashboard)/admin/requests/actions.ts`
- `src/app/company/[slug]/(dashboard)/dashboard/approvals/page.tsx`
- `src/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/approval-steps.tsx`
- `src/app/company/[slug]/(dashboard)/dashboard/_components/notification-bell.tsx`

### Files to Modify
- `src/app/company/[slug]/(dashboard)/dashboard/actions.ts` - Add collaborator logic
- `src/app/company/[slug]/(dashboard)/dashboard/requests/[requestId]/_components/chat-thread.tsx` - Parse mentions
- `src/app/company/[slug]/(dashboard)/dashboard/layout.tsx` - Add notification bell

## Next Steps
1. Implement notification system infrastructure
2. Update chat to auto-add collaborators
3. Build admin request dashboard
4. Create approval workflow UI
5. Add notification bell to header
