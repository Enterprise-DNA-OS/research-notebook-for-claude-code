---
description: Correct an entry while retaining the original.
---

Read the affected records first. Resolve ambiguous identifiers before changing anything. Obtain the factual inputs from the operator; never fill gaps with guesses.

Run `node scripts/notebook.mjs correct <experiment> --supersedes=<entry-id> --text="Correction and reason" --date=YYYY-MM-DD --actor="Operator recording this change" --json`. Replace every placeholder with the supplied values. The actor is a declared audit label, not authentication. Show the resulting record.
