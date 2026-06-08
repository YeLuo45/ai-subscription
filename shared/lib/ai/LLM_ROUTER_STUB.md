# llm-router.ts Build Stub

## Problem

`shared/lib/ai/llm-router.ts` (516-518 lines) contains valid TypeScript that
parses correctly with TypeScript and SWC, but **esbuild 0.18.x and 0.21.x
both fail** to parse it, producing a spurious `Unexpected "export"` error
at line 363 (`export function getRoutingExplanation`).

This was traced to esbuild's TS parser entering a bad state somewhere in
the function body of `routeAndCall` (line 108-301) — the file is structurally
balanced, the dynamic import statements have all been replaced with static
imports, but esbuild still misparses it.

## Workaround

Two files added:

1. **`shared/lib/ai/llm-router-stub.ts`** — A minimal stub that exports the
   same API surface (`routeAndCall`, `routeAndCallWithFallback`,
   `routeAndPrompt`, `routeAndStructuredCall`, `getRoutingExplanation`,
   `isLocalCapableTask`, `TaskType` type) so all 14 importing files in
   `web/src` continue to compile. The stub returns empty/default values,
   so AI routing is **non-functional** until the upstream parse issue is
   fixed.

2. **Vite plugin in `web/vite.config.ts`** — A `resolveId` plugin that
   intercepts every reference to `llm-router` (whether imported as
   `../../shared/lib/ai/llm-router`, `@shared/lib/ai/llm-router`, or any
   other alias form) and replaces it with the stub path. The plugin runs
   with `enforce: 'pre'` so it catches all imports before Vite's built-in
   resolution.

## Verified

- Local `npx vite build` succeeds: `✓ built in 19.67s`
- CI workflow (`ci.yml`) now uses `npm install` + `package.json` (the repo
  has no `package-lock.json`)
- GitHub Actions `Deploy Web to GitHub Pages` succeeded
- Site accessible at `https://yeluo45.github.io/ai-subscription/`

## Rollback

To restore the real implementation:

1. Remove the `llm-router-stub` plugin block from `web/vite.config.ts`
2. Delete `shared/lib/ai/llm-router-stub.ts`
3. Fix the underlying parse error in `shared/lib/ai/llm-router.ts`
   (likely candidates: simplify the return type Promise&lt;{...}&gt; generic
   on `routeAndCall`, or convert to `.mts` extension)
4. Re-run `npm run build` to confirm
