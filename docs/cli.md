# CLI reference

Run `node scripts/notebook.mjs <command>`. Flags use `--name=value`; quote values containing spaces. Every command supports `--json`. Changes require `--actor="Person recording this"`. Dates are YYYY-MM-DD; recorded event and backup dates cannot be future dates. Unknown flags fail.

## Reads

- `projects`: Review project custody and retention decisions.
- `protocols`: Find the exact protocol version.
- `experiments`: Read the experiment register.
- `experiment-week`: Plan the research week.
- `review-queue`: Find experiments waiting for independent review.
- `evidence-gaps`: Find experiments missing observations or raw evidence.
- `protocol-review`: Find active work using retired protocols.
- `actions`: Review research follow-up actions.
- `attention`: Read overdue work and unresolved archive reconciliation.
- `compliance`: Check documented research record controls.
- `archives`: Read imported notebook inventories.
- `archive-gaps`: Find missing local links in notebook exports.
- `retention-review`: Review custody, retention and backup evidence.
- `owner-workload`: Compare active work and overdue items by researcher.
- `audit`: Read the recorded change history.
- `insights`: Answer ten cross-record research questions.
- `experiment <experiment>`: Read the complete experiment history.
- `search "search phrase"`: Search notebook entries and archived page text.
- `verify-evidence <experiment>`: Recheck retained evidence files against recorded hashes.
- `verify-archive <archive>`: Recheck every stored archive file and manifest.
- `export --out=exports/notebook.json`: Export all records and retained archive bytes.
- `draft-handover <experiment>`: Draft an experiment handover locally.

## Changes

- `add-project --code=CODE --name="Project name" --owner="Owner" --jurisdiction=NZ --actor="Operator"`: Create a research project.
- `set-retention <project> --storage="Private archive reference" --policy="Approved policy reference" --until=YYYY-MM-DD --backup-verified=YYYY-MM-DD --actor="Operator"`: Record the owner-approved retention and backup decision.
- `add-protocol --code=CODE --version=1 --title="Protocol title" --file=protocol.txt --actor="Operator"`: Add an immutable protocol version.
- `retire-protocol <protocol-id> --actor="Operator"`: Retire a protocol without erasing it.
- `add-experiment --code=CODE --title="Experiment title" --project=CODE --protocol=<id> --owner="Owner" --hypothesis="Research question" --due=YYYY-MM-DD --actor="Operator"`: Plan an experiment against an exact protocol version.
- `log <experiment> --kind=observation --text="Observed facts" --date=YYYY-MM-DD --actor="Operator"`: Append an observation, result or deviation.
- `correct <experiment> --supersedes=<entry-id> --text="Correction and reason" --date=YYYY-MM-DD --actor="Operator"`: Correct an entry while retaining the original.
- `attach <experiment> --label="Raw source" --file=path/to/file --date=YYYY-MM-DD --actor="Operator"`: Record a retained file location and calculate its hash.
- `add-action <experiment> --code=CODE --text="Required follow-up" --owner="Owner" --due=YYYY-MM-DD --actor="Operator"`: Assign an experiment follow-up.
- `resolve-action <action> --resolution="Evidence-backed resolution" --actor="Operator"`: Record an action resolution.
- `submit <experiment> --conclusion="Conclusion supported by recorded evidence" --actor="Operator"`: Submit work for independent review.
- `review <experiment> --decision=accepted --evidence="Review evidence reference" --actor="Operator"`: Record a human review decision.
- `close <experiment> --actor="Operator"`: Close an accepted experiment.
- `reopen <experiment> --reason="Reason for reopening" --actor="Operator"`: Reopen work and invalidate its prior acceptance.
- `change-protocol <experiment> --protocol=<id> --reason="Reason for change" --actor="Operator"`: Record a protocol change with the previous version retained.
- `reconcile-archive <archive> --evidence="Count and attachment reconciliation reference" --actor="Operator"`: Record a person's archive reconciliation.

`log` accepts observation, result or deviation. `correct` supplies kind correction automatically and needs an entry from the same experiment. Use a fresh correction against the latest correction when correcting again. `review` accepts accepted or changes. Reopen before resubmitting work after a changes decision. Reopening appends the reason and invalidates past acceptance.

`add-action` is for planned or running work. Action resolution advances the record revision. `attach` hashes a local file up to 50 MB and records its absolute location; it does not copy that file. `verify-evidence` reopens those files and reports missing or altered content. Do not move an evidence file without preserving the original reference and recording the new one.

## Import and export

`import labarchives <extracted-folder> --project=<project> --code=<archive> --actor="Operator" [--dry-run]` stores the complete archive, indexes HTML text and checks local references. See the switching guide. `reconcile-archive` records a human's reconciliation reference; it does not suppress missing-file findings.

`export --out=exports/notebook.json` writes all records and imported file bytes without overwriting an existing file. The output includes a format version and an integrity hash in the command result. It is a portable data export, not an automatic restore command. Database backup and tested restore procedures remain the operator's responsibility.

## Drafts

`draft-weekly-review` combines attention, review queue and evidence gaps. `draft-handover <experiment>` captures the full record. Both write private draft files and return `sent:false`.
