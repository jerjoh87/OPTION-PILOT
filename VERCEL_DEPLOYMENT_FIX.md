# Vercel Deployment Fix

The Next.js app lives at the repository root.

## Correct Vercel setting

- **Root Directory:** `.`

## Why the build failed

Vercel was looking in the wrong folder and could not see the App Router directory.

## Current scripts

- `npm run dev` -> `next dev`
- `npm run build` -> `next build`
- `npm run start` -> `next start`
