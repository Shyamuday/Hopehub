# Professional directory import

The directory is private to existing email-marketing ADMIN/HR access. Source PDFs,
all extracted text, original cells and structured fields are retained in PostgreSQL.
Entries without email remain in the directory but are never email recipients.
Do not commit source PDFs or extracted JSON to Git.

## Import

1. Deploy the `20260911120000_professional_directory` migration and regenerate Prisma.
2. Install `pypdf` for the extraction environment (`python -m pip install pypdf`).
3. From `apps/api`, with the intended database environment configured, run:

```sh
python scripts/extract-professional-directory.py /private/path/directory.pdf | node --import tsx scripts/import-professional-directory.ts --stdin
```

This validates the whole document and prints counts only. The extractor supports
the iCALL spreadsheet-export layout and rejects unexpected layouts rather than
silently misassigning fields. To import, append `--apply` to the Node command.
Alternatively supply an extracted UTF-8 JSON file with `--file /private/path/data.json`.
Check the database target before applying; do not reset a divergent local database.

Reimporting the same PDF is idempotent by SHA-256 and source record ID. A newer PDF
is retained as another source snapshot. Email contacts deduplicate by normalized
address; shared mailboxes retain all role segments. Existing campaign history,
suppression handling and registered-account reconciliation remain in use.
The archive/template transaction commits before contact import; rerun a failed
contact import to finish safely. Original PDF bytes are retained only once per hash.

## Invitations

The import seeds five editable database templates without overwriting admin edits:
initial invitation, platform overview, application invitation, questions, follow-up.
No campaigns are scheduled or sent during import. Follow-up copy must only be used
after an earlier invitation; there is no automatic follow-up sequence.

In Admin → Email marketing → Templates, loading a professional template selects
PROMOTIONAL_CONTACTS with the MENTAL_HEALTH_PROFESSIONALS source segment. Replace
that segment with PSYCHOLOGIST, PSYCHIATRIST or THERAPIST to narrow by role; combine
with the existing city and other audience filters. Preview recipients before launch.
Existing batch sending, unsubscribe, tracking and delivery logs handle delivery.

Public listing is not opt-in. Imported contacts carry CONSENT_UNVERIFIED and the
source basis explicitly states that permission must be reviewed before sending.
The existing compliance confirmation remains required. Patient testimonials and
other source notes must not be used as invitation personalization.

Database backups and deletion/retention requests must cover both directory tables,
including the original PDF bytes and raw source notes.
