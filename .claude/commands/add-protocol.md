---
description: Add an immutable protocol version.
---

Read the affected records first. Resolve ambiguous identifiers before changing anything. Obtain the factual inputs from the operator; never fill gaps with guesses.

Run `node scripts/notebook.mjs add-protocol --code=CODE --version=1 --title="Protocol title" --file=protocol.txt --actor="Operator recording this change" --json`. Replace every placeholder with the supplied values. The actor is a declared audit label, not authentication. Show the resulting record.
