# Ops Dashboard Tasks

## 1. Plan Management Module (`/plans`)
- [ ] **Scaffold Route**
  - [ ] Create `app/plans/page.tsx`.
  - [ ] Create `app/plans/layout.tsx` (optional).
- [ ] **UI Components**
  - [x] `PlansTable.tsx`: List ID, Name, Price, Validity.
  - [x] `EditPlanModal.tsx`: Form to update existing plans.
  - [x] `CreatePlanModal.tsx`: Form to create new plans.
- [ ] **Server Actions**
  - [x] `updatePlan`: Update `display_name`, `price_inr`, `limits`.
  - [x] `createPlan`: Create new plans.

## 2. User Management Module (`/users`)
- [ ] **Scaffold Route** `app/users/page.tsx`.
- [ ] **Components**: `UsersTable` (Subs), `BetaRequestsTable`.
- [ ] **Actions**: `approveRequest`, `rejectRequest`.

## 3. Navigation
- [ ] Update `app/page.tsx` to link to new modules.
- [ ] Create Sidebar/Navbar component.
