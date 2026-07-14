# TheHouseHub Backup Strategy

TheHouseHub uses two GitHub repositories, one for frontend and one for backend. Code backup must protect both repositories and must never include secrets.

## Backup Layers

### 1. GitHub Source Backup

GitHub is the primary backup for source code.

Rules:

- Commit completed work in small units.
- Keep frontend and backend commits separate.
- Push validated work to `origin/main`.
- Do not leave launch-critical changes only on the local machine.

### 2. Worklog Backup

Major actions must be recorded in `docs/WORKLOG.md`.

Each entry should include:

- Date
- Scope
- Files changed
- Validation commands
- Commit hashes
- Push status
- Deployment notes

### 3. Source Archive Backup

Use the source backup script when creating a portable code snapshot:

```bash
npm run backup:source
```

By default, the script writes archives to:

```text
~/TheHouseHubBackups
```

Use a different destination for cloud or external disk backup:

```bash
THEHOUSEHUB_BACKUP_DIR="/Volumes/ExternalDrive/TheHouseHubBackups" npm run backup:source
```

or:

```bash
THEHOUSEHUB_BACKUP_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/TheHouseHubBackups" npm run backup:source
```

The archive includes:

- `frontend`
- `backend`

The archive excludes:

- `node_modules`
- `.next`
- `out`
- `build`
- `dist`
- `.git`
- `.env`, `.env.local`, `.env.production`, and all `.env*`
- logs
- database dumps
- `uploads`
- backup folders
- OS metadata such as `.DS_Store`

### 4. Release Tag Backup

Create a release tag after a stable validated state:

```bash
git tag release-YYYY-MM-DD-short-name
git push origin release-YYYY-MM-DD-short-name
```

Because frontend and backend are separate repos, create the tag in both repos when both changed.

### 5. Database Backup

Database backups are separate from source backups.

Rules:

- Never commit database dumps.
- Never put dumps inside source archives.
- Store encrypted database backups in a controlled location.
- Record backup time, database environment, and restoration instructions.

## Restore Process

1. Clone frontend and backend from GitHub.
2. Restore environment variables from the secure secret manager or deployment platform.
3. Install dependencies in each repo.
4. Restore the database separately if needed.
5. Run validations before deployment.

## Safety Invariants

- Secrets must never enter Git or zip archives.
- Source backup must be reproducible from a clean checkout.
- Every production restore must have both source state and database state identified.
- Frontend and backend release tags must be aligned for stable checkpoints.
