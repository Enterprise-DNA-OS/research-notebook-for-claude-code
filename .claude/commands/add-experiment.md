---
description: Plan an experiment against an exact protocol version.
---

Read the affected records first. Resolve ambiguous identifiers before changing anything. Obtain the factual inputs from the operator; never fill gaps with guesses.

Run `node scripts/notebook.mjs add-experiment --code=CODE --title="Experiment title" --project=CODE --protocol=<id> --owner="Owner" --hypothesis="Research question" --due=YYYY-MM-DD --actor="Operator recording this change" --json`. Replace every placeholder with the supplied values. The actor is a declared audit label, not authentication. Show the resulting record.
