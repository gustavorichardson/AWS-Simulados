# Security Audit — AWS Simulados

## Scope
This follow-up audit reviews the three previously raised issues only, preserving the project’s existing behavior and validating the real evidence already in code and tests.

## Re-evaluation of the three findings

### 1) Gabarito no modo estudo
Status: not a confirmed security vulnerability; it is an intentional product behavior.

Business rule formalized:
- `PROVA`: the system must not reveal the answer key or explanations before the exam is finished.
- `ESTUDO`: after the answer is confirmed, the user may receive feedback and explanations for learning purposes, consistent with the current implementation.

Evidence:
- `src/lib/exam-service.ts` defines `getStudyFeedback()` and returns `correctOptionId` and `optionExplanations` when `attempt.mode === "ESTUDO"`.
- `src/components/QuestionCard.tsx` uses `studyFeedback` to display the correct answer and disable further changes after confirmation.
- The UI intentionally distinguishes study mode from exam mode in `src/components/ExamSummary.tsx` and `src/components/QuestionCard.tsx`.
- The project spec and product workflow treat study mode as a learning mode, not a closed exam.

Conclusion:
- The behavior is intentional and aligned with the product’s learning model.
- It is not a security bug in the classic sense, but the business rule should be kept explicit and documented so the distinction is deliberate and consistent across product and tests.
- In the current implementation, the exposure is limited to `ESTUDO` mode and does not occur in `PROVA` mode.

### 2) CSRF / Origin validation
Status: not a confirmed vulnerability in current architecture.

Evidence:
- `src/lib/api.ts` includes `hasTrustedRequestOrigin()` and rejects mutations with a mismatched Origin/Referer.
- `tests/apiRoutes.test.ts` explicitly asserts that cross-origin mutation requests are blocked.
- The app also uses Better Auth session cookies with `httpOnly`, `sameSite: "lax"`, and environment-aware secure configuration in `src/lib/auth.ts`.
- The middleware enforces session-based protections and CSP in `src/middleware.ts`.

Conclusion:
- The absence of Origin/Referer in a request is not by itself a vulnerability when the app relies on same-site cookie protections, origin checks on mutating routes, and authenticated session handling.
- The actual risk is lower than a classic CSRF issue because the app is not accepting anonymous cross-site mutation without additional safeguards.
- This should remain as a hardening review item, not as a confirmed exploitable flaw.

### 3) Autorização administrativa (404 vs 403)
Status: not a confirmed authorization flaw.

Evidence:
- `tests/e2e/admin.spec.ts` expects `404` for unauthenticated or non-admin users on admin pages and admin APIs.
- `src/app/admin/layout.tsx` uses `notFound()` when the user is not an admin.
- `src/middleware.ts` also treats admin routes and admin APIs as not found for non-authorized users.
- This behavior is consistent throughout the product and appears intentional.

Conclusion:
- Returning `404` is a deliberate product decision to hide the existence of protected admin surfaces from unauthorized users.
- This is not evidence of improper access, and it is consistent with the application’s route-level design.

## Test execution results
Executed and passed:
- `npm run test` → 18 files passed, 84 tests passed
- `npm run typecheck` → success
- `npm run lint` → success
- `npm run build` → success

Executed earlier and already reviewed:
- `npm audit --json --omit=dev` → zero vulnerabilities reported in production dependencies

## Secrets and Git safety review

### Git state
Current status:
- branch: `master`
- modified tracked files: `.env.example`, `.gitignore`, `README.md`
- no destructive commands have been executed
- no history rewrite, reset, rebase, or push was performed

### Secret scan
- Gitleaks found 7 historical and 16 working-tree findings in its JSON reports.
- The historical findings are limited to placeholder text in `.env.example` and the audit report; local inspection confirmed these are not live credentials.
- Current `.env` findings are local configuration values in an ignored file and do not occur in Git history.
- `.next/` findings are generated build/cache data. The directory is ignored and not tracked.
- An exact-value check found no configured local credential values in `.next/static/` or `public/`.
- `.env`, `.env.local`, and `.next/` are ignored and do not appear in locally reachable commits.
- No live credentials were identified in the findings. Since the historical report contains placeholder matches, Gitleaks may continue to report these false positives.

## Overall assessment
Classification: APTO COM RESSALVAS

Why:
- No confirmed critical vulnerability in the application code reviewed in this follow-up.
- All automated validation steps passed.
- No obvious live secrets were found in the tracked files and local Git state inspected.
- The study/prova distinction is now explicitly documented as an intentional product policy.
- Secret-scanner findings were classified as placeholders or ignored local build/environment data, not live credentials.

## Remaining concerns
- The admin route 404 pattern is not a security bug but should remain documented as a design choice if the team values hiding protected paths.
- Run a final Gitleaks scan before the first push; the known placeholder matches may require a documented allowlist or remain as reviewed false positives.
