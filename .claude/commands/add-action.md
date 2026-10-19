---
description: Assign an experiment follow-up.
---

Read the affected records first. Resolve ambiguous identifiers before changing anything. Obtain the factual inputs from the operator; never fill gaps with guesses.

Run `node scripts/notebook.mjs add-action <experiment> --code=CODE --text="Required follow-up" --owner="Owner" --due=YYYY-MM-DD --actor="Operator recording this change" --json`. Replace every placeholder with the supplied values. The actor is a declared audit label, not authentication. Show the resulting record.
