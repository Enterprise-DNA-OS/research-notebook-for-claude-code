---
description: Record the owner-approved retention and backup decision.
---

Read the affected records first. Resolve ambiguous identifiers before changing anything. Obtain the factual inputs from the operator; never fill gaps with guesses.

Run `node scripts/notebook.mjs set-retention <project> --storage="Private archive reference" --policy="Approved policy reference" --until=YYYY-MM-DD --backup-verified=YYYY-MM-DD --actor="Operator recording this change" --json`. Replace every placeholder with the supplied values. The actor is a declared audit label, not authentication. Show the resulting record.
