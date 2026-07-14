# TheHouseHub Release Checklist

Use this checklist before marking a version stable or sending it to production.

## 1. Repository Status

Frontend:

```bash
cd /Users/akilibashige/Documents/propertyos/thehousehub.pro/frontend
git status --short --branch
```

Backend:

```bash
cd /Users/akilibashige/Documents/propertyos/thehousehub.pro/backend
git status --short --branch
```

Required:

- No unstaged production changes.
- No unrelated files in the commit.
- Frontend and backend scopes are separated.

## 2. Backend Validation

Run from `backend`:

```bash
node --check server.js
npm run build
```

When Prisma schema changes are involved:

```bash
npx prisma validate
```

Required:

- No syntax errors.
- Prisma Client generation succeeds.
- Organization scoping and authorization are preserved.

## 3. Frontend Validation

Run from `frontend`:

```bash
npx tsc --noEmit --pretty false
npm run lint -- --quiet
npm run build
```

Note:

- In this Codex sandbox, `npm run build` may fail with a Turbopack `binding to a port` sandbox restriction. Re-run it outside the sandbox when that specific error appears.

Required:

- TypeScript passes.
- ESLint passes.
- Production build passes.

## 4. Payment and Settings Mapping

Verify:

- Owner Payment Settings displays clear labels and helper text.
- Tenant Payment View shows the same configured values.
- Rent, due day, late fee, payment instructions and support email are consistent.
- Manual payment flow still submits proof for admin approval.

## 5. Tenant and Admin Critical Paths

Verify:

- Admin login.
- Tenant login.
- Add property.
- Add tenant.
- Tenant payment submission.
- Admin To Do approval/rejection.
- Tenant notifications.
- Tenant/Admin messages.
- Maintenance request submission.
- Settings save.

## 6. Backup Before Release

Run from `frontend`:

```bash
npm run backup:source
```

Move or sync the archive to:

- external disk, or
- iCloud/Google Drive/Dropbox, or
- another controlled backup store.

## 7. Commit, Push and Tag

Commit:

```bash
git add <files>
git commit -m "Clear release message"
git push
```

Tag stable releases:

```bash
git tag release-YYYY-MM-DD-short-name
git push origin release-YYYY-MM-DD-short-name
```

Repeat tags in frontend and backend when both changed.

## 8. Worklog

Update `docs/WORKLOG.md` with:

- What changed
- Validation evidence
- Commit hashes
- Backup archive path
- Release tag
- Deployment status
