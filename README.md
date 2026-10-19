# Research Notebook for Claude Code

Keep the experiment, the protocol version and the evidence together. Review unfinished work, preserve old notebooks and prepare a project handover from a database you own. Built by Enterprise DNA. MIT licensed.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Install, try the demo and bring your notebook archive. | Your fields, review rules, reports and connections. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=labarchives&utm_medium=readme) | [Talk to Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=labarchives&utm_medium=readme) |

LabArchives Professional Corporate lists US$575 per user per year. Its corporate ELN + Inventory bundle lists US$675 per user per year. [Official pricing](https://www.labarchives.com/pricing), checked 19 October 2026. Hosting and coding-agent accounts remain separate costs when you run this base.

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/research-notebook-for-claude-code.git
cd research-notebook-for-claude-code
npm install
npm test
npm run demo
```

Use Node 22 or later. The demo creates an isolated temporary database, imports a fictional notebook and renders reports, then removes its temporary files. It never connects to DATABASE_URL. Add `-- --keep` to retain the temporary demo and view its reports. For persistent fictional records, run `npm run migrate` then `npm run seed`. For real work, migrate without seeding.

Open this folder in Claude Code, Codex, OpenCode or Cursor. Ask for `/experiment-week`. Leave DATABASE_URL unset for local PGlite, or configure a private Postgres 15+ database with an owner connection. TLS certificates are verified. Restricted roles receive no default access. This base is for one trusted operator, not a shared authenticated service.

```bash
node scripts/notebook.mjs attention
node scripts/notebook.mjs experiment COAT-01 --json
node scripts/notebook.mjs review-queue
npm run view
npm run docs
```

## Weekly research work

- `/experiment-week` plans active experiments by owner and due date.
- `/review-queue` finds submitted work waiting for independent review.
- `/evidence-gaps` checks observations, source files and retired protocols.
- `/protocol-review` finds active work still tied to retired versions.
- `/retention-review` checks project custody, retention decisions and recorded backup checks.
- `/weekly-review` combines attention, review queue and evidence gaps into a local draft.

There are 45 workflow commands, including `/customise` and `/new-view`. [CLI reference](docs/cli.md) lists the exact inputs. Reads produce human-readable output by default and support `--json`. Exact names match without case sensitivity. Partial names and identifiers work only when unique; ambiguity lists candidates and exits with failure.

## Bring your LabArchives notebook

Create an Offline Notebook in LabArchives, download the ZIP and extract it. Then:

```bash
node scripts/notebook.mjs import labarchives ./imports/notebook --project=COAT --code=OLD-COAT --actor="Notebook custodian" --dry-run
```

Remove `--dry-run` to commit the import. The project must already exist. The importer stores the archive's original file bytes and hashes, indexes HTML text and lists missing local links. It preserves a read-only archive; it does not turn old pages into structured experiments or recreate signing, sharing or revision history. Identical reimports are skipped; changed exports need a new archive code. [Switching guide](docs/replace-labarchives.md) explains reconciliation and file limits. The example archive is synthetic, not a vendor-certified fixture.

## Records that survive review

Entries, evidence references, review records and audit rows are append-only. A correction points to the original entry. Protocol text is versioned; retirement leaves the old version intact. Submission needs an observation, raw evidence and a current protocol. A contributing author cannot accept their own work. Open actions prevent acceptance. Reopening invalidates the previous acceptance; closing needs an accepted current revision.

The reviewer and actor are declared labels. They are not verified identities, electronic signatures or evidence of institutional authorization. The owner can administer the database, so this is not tamper-proof storage. Evidence attachments retain a path and hash; keep the actual files in your controlled archive and check them with `/verify-evidence`. Imported archive files are stored in full and included in exports.

## Reports in your name

Change `brand.json` to set the business name, logo and colours. `npm run view` produces three read-only dashboards: research week, evidence and archives. `npm run docs` produces experiment records, project handovers and archive reconciliation records. Generated files stay local. Print them to PDF after checking the data. `/new-view` adds a read-only view; `/customise` changes fields and rules through a migration.

## Ten questions answered from your records

`/insights` answers all ten today. These combine your records; we do not claim that LabArchives cannot answer them through its own reporting or custom work.

1. Which overdue experiments also lack raw evidence?
2. Whose review queue still contains open actions?
3. Which active experiments use retired protocols?
4. Which projects have no documented retention decision?
5. Which experiment records contain deviations?
6. Which researchers have overdue work and unresolved actions?
7. Which archived notebooks still need reconciliation?
8. Which exported pages refer to missing files?
9. Which projects combine evidence gaps with an overdue backup check?
10. Which closed records lack acceptance of their current revision?

## Your first hour: ten things to ask for

1. Show this week's experiments and who owns each one.
2. Find overdue work with no source evidence.
3. Show the exact protocol version behind the coating trial.
4. Correct an observation while keeping the original.
5. Find work ready for another person to review.
6. Check the files behind an experiment against their stored hashes.
7. Bring in an old notebook and list missing files.
8. Prepare a project handover without sending it.
9. Put our business name and colours on the reports.
10. Add our own funding reference and retention rule.

## Scope and verification

This base serves non-clinical industrial research. It does not validate science, operate instruments, manage patient records, provide regulated electronic signatures or certify compliance. Do not replace a validated GxP system with it. Institution-specific access controls, validation and regulated workflows require a separately approved system.

`npm test` uses isolated fictional data and covers every CLI operation, migrations and repeat seeding, review transitions, immutable history, archive byte preservation, missing links, conflicting imports, permissions, drafts and escaped HTML. CI runs on Windows and Linux. Local tests use Linux and PGlite; no live Postgres server was used. See [record controls](docs/compliance.md), [selection evidence](docs/research.md) and [scope](docs/why-no-front-end.md).
