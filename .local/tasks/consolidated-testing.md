---
title: "Consolidated: Write all outstanding tests in one pass"
---
# Consolidated Testing Task

## Objective
Write all outstanding tests in a single pass. Replaces individual test tasks
#88, #91, #93, #95 which have been cancelled.

## Tests to cover

### 1. Dropdown retention (replaces #87, #95)
- Verify all recently-fixed dropdowns stay selected after re-renders
- Files: income-form, expense-form, employee-form, income-form-new,
  social-media-portal, services pages, trust administration, admin editors
- Confirm `value` (controlled) pattern is working throughout

### 2. Correct date on project cards (replaces #91)
- Test project-card.tsx shows `scheduledDate` when present, falling back to `date`
- Simulate rescheduled booking and verify card shows updated date

### 3. Correct booking date in income form (replaces #93)
- Test income-form and income-form-new booking dropdowns show `scheduledDate ?? date`
- Verify the correct label after rescheduling

### 4. Test runner workflow (replaces #88)
- Register a "Run tests" workflow running `npx vitest run`
- Verify existing 22 passing tests still pass

## Done looks like
All tests pass. Coverage spans date-fix and dropdown-fix changes.
Existing tests continue to pass. A named workflow runs the full suite.

## Relevant files
- client/src/__tests__/ or client/src/components/**/__tests__/
- vitest.config.ts, client/src/test-setup.ts
- client/src/components/finance/income-form.tsx
- client/src/components/finance/income-form-new.tsx
- client/src/components/client/project-card.tsx
