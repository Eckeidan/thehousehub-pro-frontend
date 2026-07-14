# TheHouseHub Worklog

This file records important engineering actions for the split TheHouseHub platform.

## Current Baseline

Date: 2026-07-14

Repositories:

- Frontend: `/Users/akilibashige/Documents/propertyos/thehousehub.pro/frontend`
- Backend: `/Users/akilibashige/Documents/propertyos/thehousehub.pro/backend`

Baseline status:

- Frontend `main` is synchronized with `origin/main`.
- Backend `main` is synchronized with `origin/main`.

Latest confirmed commits:

- Frontend `8226421 Refresh settings page design`
- Backend `ae4a941 Centralize payment settings contract`

## Operating Rule

Every significant change must be logged with:

- Date
- Scope
- Files or modules changed
- Validation commands
- Commit hash
- Push status
- Deployment or backup notes

## Entries

### 2026-07-14 - Backup and release discipline added

Scope:

- Documentation and source backup process.

Changes:

- Added `docs/WORKLOG.md`
- Added `docs/BACKUP_STRATEGY.md`
- Added `docs/RELEASE_CHECKLIST.md`
- Added `scripts/backup-source.js`
- Added `npm run backup:source`

Validation:

- `node --check scripts/backup-source.js`
- `npx tsc --noEmit --pretty false`
- `npm run lint -- --quiet`
- `git diff --check`
- `THEHOUSEHUB_BACKUP_DIR=/private/tmp/thehousehub-backup-test npm run backup:source`
- `zipinfo` check confirmed `BACKUP_MANIFEST.json` exists and no `node_modules`, `.env`, or `.next` entries matched.
- `npm run build`

Commit:

- Same commit as this worklog entry: `Add source backup workflow`

Notes:

- Source archives must exclude dependencies, build output, logs, secrets, dumps, and local generated files.
- Test archive path: `/private/tmp/thehousehub-backup-test/thehousehub-source-2026-07-14_05-32-21-510UTC.zip`
