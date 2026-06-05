# Vercel Deployment Fix

The Next.js app lives at the repository root.

## Correct Vercel setting

- **Root Directory:** `.`

The deployed dashboard is intentionally self-contained so Vercel can build it reliably while the larger app modules are synced in later.
