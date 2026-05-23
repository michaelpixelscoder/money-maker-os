# Money Maker OS

The first business operating-system app for Money Maker. It starts with the Tasks activity and is built for human, agent, and client collaboration.

## Stack

- Vite + React + TypeScript
- Tailwind CSS with Shadcn-style component conventions
- Convex Cloud
- GitHub Pages

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`:

```bash
VITE_CONVEX_URL=https://adventurous-tiger-371.convex.cloud
```

## Convex

The current dev deployment is `dev:adventurous-tiger-371`.

```bash
npx convex dev
```

Authentication uses Convex Auth with email/password credentials. The public GitHub Pages app renders a sign-in screen first, public sign-up is disabled, and workspace queries/mutations require an authenticated Convex session.

The default admin account has been bootstrapped in the dev deployment:

- Email: `admin@money-maker.local`
- Password: `M0neyM@ker!2026`

Change this password from the Admin activity after first sign-in.

## Checks

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```
