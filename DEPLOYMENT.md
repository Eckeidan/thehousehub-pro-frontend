# The House Hub Frontend Deployment

Next.js frontend for The House Hub.

## Required Environment

Configure this variable in Vercel or the hosting provider:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.example.com/api
```

## Production Commands

```bash
npm ci
npm run build
npm start
```

## Launch Checks

```bash
npm run build
npm run lint
```

`npm run build` must pass before deployment. Lint currently reports existing type cleanup items and should be treated as a post-launch hardening task if the production build is green.
