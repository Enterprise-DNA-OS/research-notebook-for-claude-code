# Research record controls

Checked 19 October 2026. Scope: non-clinical industrial research records. These checks support recordkeeping; they do not certify compliance, validate results or authorize regulated research.

## Source rules

The [Australian Code for the Responsible Conduct of Research 2018](https://www.nhmrc.gov.au/sites/default/files/documents/attachments/the-australian-code-for-the-responsible-conduct-of-research-2018.pdf) describes institutional storage responsibilities in R8 and researcher recordkeeping responsibilities in R22. Its scope and funding conditions determine applicability; it is not a universal statute for every business. NZ projects use the configured local policy; AU labels do not assert that an Australian code governs NZ work.

The [Management of Data and Information in Research guide](https://www.nhmrc.gov.au/sites/default/files/documents/attachments/Management-of-Data-and-Information-in-Research.pdf) supports the Code with guidance on custody, retention and access. The operator records the actual institutional retention policy and date. This base never invents a universal retention period.

| Check | Implementation | Source and limit |
|---|---|---|
| Documented custody | Missing project storage location, policy reference or retention date | R8 as a record-control prompt; owner confirms applicability |
| Complete research record | Submitted or closed work has no raw evidence reference | R22; a reference is not proof that the result is valid |
| Archived notebook reconciliation | Import has no reconciliation evidence, or exported pages point to missing local files | R22; source counts and oversized attachments need human reconciliation |
| Recorded backup check | Missing date or more than 30 days since verification | Local demonstration policy, not a legal interval; the tool does not perform backups |
| Retention review | Approved retention date reached | Local policy; flag for review, never delete automatically |
| Current review | Closed work has no accepted review of its current revision | Local research desk policy, not a regulated signature rule |

Run `/compliance` or `node scripts/notebook.mjs compliance --json`. Each finding names the record and rule. Read the underlying record and source before changing policy. `/verify-evidence` checks file availability and hash integrity; `/verify-archive` checks bytes stored in the database. Neither check proves that a document is scientifically accurate.

Entry, artifact, review and audit records cannot be updated or deleted through ordinary SQL without removing their protective triggers. A database owner can alter these controls. Declared actor and reviewer names do not authenticate a person. Use a private database, restricted filesystem and separate verified backups. Shared identity, regulated signatures and validation require a separate reviewed installation; the base is not for clinical trials, GxP records or patient information.
