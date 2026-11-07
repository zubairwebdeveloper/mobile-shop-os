# Dependency Compatibility Report (Phase 0)

**Nothing is installed. No version numbers are asserted** because the npm registry was not reachable
from the audit environment (403 security policy). Run the verification checklist at the start of each
phase that installs packages.

Local environment observed: Node v22.x present in the audit sandbox. Confirm your own Node version
against the Next.js minimum before scaffolding.

## Compatibility rules to verify (from general knowledge — confirm against current docs)

| Topic | Rule to verify |
|---|---|
| React / R3F | React Three Fiber major versions are tied to React majors (R3F v9 <-> React 19, v8 <-> React 18). Pick R3F and Drei as a matched pair. |
| Drei / R3F / three | Drei major must match the R3F major; `three` must satisfy both peer ranges. |
| Next.js / React | Next.js App Router requires a specific React major; use the versions Next's `create-next-app` pins. |
| Tailwind / shadcn | Tailwind v3 vs v4 changes config style (`tailwind.config.js` vs CSS-first). Confirm the shadcn CLI supports your chosen major and generates JSX (not TSX) with `tsx: false` in `components.json`. |
| Framer Motion | The library has been published under both `framer-motion` and `motion` names. Choose one; confirm React peer range. |
| GSAP | ScrollTrigger ships inside `gsap`; plugin licensing has changed over time — confirm current terms. |
| Firebase | Client `firebase` and `firebase-admin` are independent; do not import Admin into client code (`server-only`). Confirm Admin SDK works in your chosen hosting runtime (Node runtime, not Edge). |
| Redux Toolkit / react-redux | Use matched current majors; Provider must be a Client Component. |
| Zod | Check major version before copying examples (API differs between majors); share schemas client/server. |
| React Hook Form + shadcn | Per your preference: shadcn **Field** components with React Hook Form (not the old Form component), Card for form containers, never `asChild`. |
| Dexie | Browser-only; load inside Client Components / dynamic import. |
| Vitest / Playwright | Playwright browser downloads need network access in CI. |
| `@firebase/rules-unit-testing` | Requires Firebase emulator (Java runtime) and a compatible `firebase` client major. |
| Gemini | Use Google's current official JS SDK, server-side only; model names change — keep behind an adapter. |
| Lenis | Optional; only if it passes reduced-motion and keyboard/accessibility checks. |

## Verification checklist (run before each install)
1. `npm view <pkg> version peerDependencies engines` for every package in the phase.
2. Confirm peer ranges overlap with the installed React / Next / three versions.
3. Install the phase's packages in one command; commit lockfile.
4. `npm ls` shows no unmet peers; `next build` succeeds.
5. Record exact versions in `docs/ARCHITECTURE.md`.

## Packages by phase (planned, not installed)
- **Phase 1:** next, react, react-dom, tailwindcss (+postcss/autoprefixer as needed), shadcn deps
  (radix, class-variance-authority, clsx, tailwind-merge, lucide-react), next-themes, sonner,
  framer-motion, @reduxjs/toolkit, react-redux, react-hook-form, zod.
- **Phase 2:** firebase, firebase-admin, server-only, @firebase/rules-unit-testing, vitest, firebase-tools (dev).
- **Phase 4-5:** @tanstack/react-table, recharts, cmdk (command palette), dnd-kit if needed.
- **Phase 6-8:** barcode/QR scanning library (choose after browser-support review), @tanstack/react-virtual if needed.
- **Phase 13:** Gemini SDK (server only).
- **Phase 16:** dexie.
- **Phase 18:** three, @react-three/fiber, @react-three/drei, gsap.
- **Phase 19:** @playwright/test.

Do not install ahead of the phase that needs them.
