# Research Notebook for Claude Code: operating instructions

This system is for a trusted operator managing non-clinical research records. Read the README and `docs/compliance.md` before changing records. Do not use it for patient data, regulated submissions or instrument control.

## Rules

- Read the affected record before writing. Never invent an observation, result, owner, signature or approval.
- Resolve ambiguous names before writing; the CLI lists candidates and exits with failure.
- One CLI: `node scripts/notebook.mjs`. `--json` is the machine interface. Read `docs/cli.md` for fields.
- Every change requires a declared `--actor`. It is an audit label, not identity verification.
- Preserve originals. Corrections append; protocol changes create a version or a documented link change.
- Review names must represent a real person's review. A label alone is not a regulated signature.
- Never send, publish, delete, share records or change access controls without explicit authorization.
- Drafts stay in `drafts/`. Generated reports stay local and read-only.
- Do not run seed on a real notebook. Back up the database and referenced files together.
- Every new field or rule uses the next numbered migration; never rewrite an applied migration.

## Routing

| Ask | Workflow |
|---|---|
| Review project custody and retention decisions | `/projects` |
| Find the exact protocol version | `/protocols` |
| Read the experiment register | `/experiments` |
| Plan the research week | `/experiment-week` |
| Find experiments waiting for independent review | `/review-queue` |
| Find experiments missing observations or raw evidence | `/evidence-gaps` |
| Find active work using retired protocols | `/protocol-review` |
| Review research follow-up actions | `/actions` |
| Read overdue work and unresolved archive reconciliation | `/attention` |
| Check documented research record controls | `/compliance` |
| Read imported notebook inventories | `/archives` |
| Find missing local links in notebook exports | `/archive-gaps` |
| Review custody, retention and backup evidence | `/retention-review` |
| Compare active work and overdue items by researcher | `/owner-workload` |
| Read the recorded change history | `/audit` |
| Answer ten cross-record research questions | `/insights` |
| Create a research project | `/add-project` |
| Record the owner-approved retention and backup decision | `/set-retention` |
| Add an immutable protocol version | `/add-protocol` |
| Retire a protocol without erasing it | `/retire-protocol` |
| Plan an experiment against an exact protocol version | `/add-experiment` |
| Append an observation, result or deviation | `/log` |
| Correct an entry while retaining the original | `/correct` |
| Record a retained file location and calculate its hash | `/attach` |
| Assign an experiment follow-up | `/add-action` |
| Record an action resolution | `/resolve-action` |
| Submit work for independent review | `/submit` |
| Record a human review decision | `/review` |
| Close an accepted experiment | `/close` |
| Reopen work and invalidate its prior acceptance | `/reopen` |
| Record a protocol change with the previous version retained | `/change-protocol` |
| Record a person's archive reconciliation | `/reconcile-archive` |
| Read the complete experiment history | `/experiment` |
| Search notebook entries and archived page text | `/search` |
| Recheck retained evidence files against recorded hashes | `/verify-evidence` |
| Recheck every stored archive file and manifest | `/verify-archive` |
| Export all records and retained archive bytes | `/export` |
| Draft an experiment handover locally | `/draft-handover` |
| import | `/import` |
| weekly-review | `/weekly-review` |
| draft-weekly-review | `/draft-weekly-review` |
| documents | `/documents` |
| views | `/views` |
| Add fields or change rules | `/customise` |
| Add a read-only dashboard | `/new-view` |

All coding agents use `.claude/commands/`. `AGENTS.md` points here. Tests and demo use temporary local databases. Any safety or compliance gap is a record to investigate, not proof of misconduct or legal non-compliance.

Built and run for businesses through Omni by Enterprise DNA.
