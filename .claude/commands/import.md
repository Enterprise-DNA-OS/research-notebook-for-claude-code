---
description: Preserve and index a LabArchives offline notebook export.
---

Read `docs/replace-labarchives.md`. Ask for the extracted offline notebook directory, target project and unique archive code. Run `node scripts/notebook.mjs import labarchives <folder> --project=<project> --code=<archive> --actor="Operator" --dry-run --json`. Show file count and missing links. Then run the same command without `--dry-run` for the authorized import. Verify with `verify-archive`, compare with the original notebook and retain reconciliation evidence. Do not claim that signatures, permissions or entry history were reconstructed.
