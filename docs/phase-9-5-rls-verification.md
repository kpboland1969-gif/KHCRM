# KHCRM Phase 9.5: RLS Verification

## Setup
- Assign 2–3 leads to Adam (test user)
- Keep at least 1 lead assigned to an admin

## As Adam (incognito):
- /dashboard/leads shows only leads assigned to Adam
- Direct URL to a lead assigned to admin should fail (not found/forbidden)
- /dashboard/follow-ups only shows Adam's leads
- /dashboard/analytics only shows Adam's leads
- Email History only shows Adam's leads

## API checks
- Visit `/api/dev/rls-check` (as Adam):
  - Should only see leads assigned to Adam
  - `leadsCount` matches UI
  - `leadIds` matches UI
- Visit `/api/dev/rls-check?leadId=<adminLeadId>` (as Adam):
  - Should return `found: false` for a lead not assigned to Adam

## Notes
- All checks must pass with no RLS leaks.
- Do not use service role for these checks.
