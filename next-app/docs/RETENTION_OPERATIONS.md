# Data retention operations

Retention is configuration-driven and must be run in dry-run mode first. Booking and payment records are never deleted by a generic cleanup job; they require an approved accounting/legal policy and an explicitly reviewed migration.

The safe workflow is:

1. Run the candidate query in an isolated development/test database with `DRY_RUN=true`.
2. Review counts and sample IDs without exporting personal data.
3. Obtain change approval, set the category-specific retention values, and run the approved anonymization/deletion job only outside production unless the production change has explicit operator confirmation.
4. Write an audit event containing category, cutoff, count and approval ID. Never write credentials or record contents.

Backups must be encrypted and retained separately from the primary database. Restore rehearsals must target an isolated test database; production restore requires a named incident/change approval and must never overwrite the live database as an unattended job.
