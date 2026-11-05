# Remediation Plan

## Goal
Prepare the application for safe GitHub publication without changing the current valid features, while preserving an intentionally documented study-mode behavior.

## Ordered remediation plan

### 1) Formalize the business rule for study mode
Status: complete as documentation; no code change required.

Policy:
- `ESTUDO` may show feedback and explanations after answer confirmation.
- `PROVA` does not reveal the answer key or explanations before finalization.
- Existing tests cover the intended distinction; retain them as regression coverage.

### 2) Harden route-origin validation for mutating API endpoints
Status: no confirmed vulnerability; no remediation is currently required.

The existing origin check and cookie/session protections are retained. The current API route tests cover accepted same-origin and rejected cross-origin mutations. Revisit only if the request model or deployment boundary changes.

### 3) Document admin route behavior intentionally
Status: no confirmed vulnerability; `404` is intentional behavior.

Existing end-to-end tests verify that unauthenticated and non-admin users receive `404`. No code remediation is required.

### 4) Keep secrets out of tracked files and history
Problem:
- The repository uses template values in `.env.example`, which is acceptable if they remain placeholders.

Action:
- Maintain `.env.example` as template only.
- Ensure `.env` and `.env.local` remain untracked and never committed.
- Continue to avoid publishing local Git history with secrets.

Suggested commit:
- `chore: ensure env templates remain non-secret`

## Commit order recommendation
1. Run Gitleaks with history enabled immediately before the first push; investigate any finding not covered by the already verified placeholder classifications.
2. Keep `.env`, `.env.local`, build output, and credentials out of the index.
3. If new security or product behavior changes are later approved, implement and commit them separately with focused regression tests.

## Verification after each change
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
