# Replace LabArchives for a non-clinical research notebook

## Export the source

LabArchives documents Utilities > Create Offline Notebook, with a choice of a full notebook or selected folder. Download the ZIP from the email or activity feed and extract it. The root contains `notebook_home_page.html`. You can export only content you are allowed to access. Files larger than 250 MB are omitted from the vendor's offline export and need separate retrieval.

Source: [Creating an Offline Notebook](https://help.labarchives.com/hc/en-us/articles/11778416826004-Creating-an-Offline-Notebook), checked 19 October 2026.

## Import once, reconcile before switching

Create the destination project, record its approved retention policy and keep the vendor ZIP unchanged. Run:

```bash
node scripts/notebook.mjs import labarchives ./imports/notebook --project=COAT --code=COAT-ARCHIVE-1 --actor="Notebook custodian" --dry-run
```

Remove `--dry-run` to store the archive transactionally. All file bytes, relative paths, hashes, HTML titles and extracted text are retained. Symlinks, non-portable paths and case-colliding paths fail. The base accepts 50 MB per file, 200 MB total and 5,000 files. Split a larger vendor export into folder exports or customise the storage path before migration; never silently drop files.

The index stores one record per file, including navigation files. It is not an experiment or entry count. Images, Office files and PDFs retain their bytes, but their content is not text-indexed. External links are retained in the original files and are not fetched. Missing local links are reported; this check does not prove that the vendor exported every attachment or historical version.

Run `verify-archive <archive>`, `archive-gaps`, and `search "known phrase"`. Compare the notebook tree, selected pages and attachment totals with the source. Retrieve oversized and missing originals separately into the approved archive. Record the reconciliation with `reconcile-archive <archive> --evidence="Reconciliation reference" --actor="Custodian"`.

Identical reimports under the same archive code are no-ops. Changed bytes or a changed target project cause a conflict before any import is committed. Give a newer export a new code so the earlier one remains intact.

## What maps and what does not

HTML titles and readable page text become searchable archive records; original paths, bytes and hashes remain available in the native export. New structured projects, protocol versions, experiments, observations and reviews start from reviewed inputs. The importer does not infer experiments from arbitrary page layouts, recreate vendor signatures, transfer permissions or rebuild vendor revision history. Preserve the original system and its access while reviewing those requirements.

The sample in `examples/offline-notebook/` is a synthetic format fixture with a deliberately missing image. It is not a vendor-produced export. Test a real export before retiring any source account. A small archive can be imported in one command; reconciliation and review of signed or regulated material are separate work.
