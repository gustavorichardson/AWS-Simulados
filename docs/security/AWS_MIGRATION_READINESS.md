# AWS Migration Readiness

## Current local-first state
The project is intentionally designed for a local Windows development setup with PostgreSQL and local auth secrets. This is appropriate for the current phase.

## Security constraints for AWS migration
- Keep all secret values in environment variables, never in source control.
- Prefer AWS-managed secrets management instead of `.env` files in runtime.
- Continue to validate session cookies, CSRF protections, and admin access patterns in the deployment environment.
- Split app and database roles so the application does not hold unnecessary privileges.

## Migration checklist
- validate production environment variables
- setup secure PostgreSQL access and least-privilege database user
- confirm Better Auth session policy in deployed environment
- secure admin identity configuration via environment variables
- use HTTPS with HSTS in production
- review admin route behavior and public HTTP status contract
- re-test all flows in deployed environment

## Current conclusion
The project is operationally ready for local development and a cautious migration plan. The study-mode answer policy is explicit: feedback is allowed after confirmation in `ESTUDO`, while `PROVA` withholds the answer key until finalization. AWS deployment readiness still requires the environment, database, HTTPS, and authorization checks above to be performed in the actual deployment environment.
