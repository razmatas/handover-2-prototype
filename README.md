# Handover 2 Prototype

Frozen static reference distribution of the reviewed Handover Concept Demo.
This repository contains the compiled app and marketing export, with a new Git
history. It is separate from product development and contains no backend,
credentials, environment files, dependency folders, or build cache.

App: `/handover-concept-demo/`  
Marketing: `/handover-concept-demo/marketing/`  
Privacy and Terms: `/handover-concept-demo/marketing/privacy/` and
`/handover-concept-demo/marketing/terms/`.

The root redirects to the app prefix on Vercel. `vercel.json` selects no framework,
serves `public`, and disables install/build commands. It defines no rewrite or SPA
fallback; missing files and unexported routes retain a real 404.

## Provenance

Approved original: `85f2258e71ee9feabddc18c090e7cf5a208ec66e`.  
Final reviewed reference: `7dfb0dad5cf3bf53377476abf0df033264dd69a0`.  
Source worktree: `/Volumes/Baro/03 Local Projects/handover.today-frontend-preview`.

The 343 files under `public/handover-concept-demo` are unchanged bytes from
`handover-concept-demo-publish.zip` (8,356,576 bytes), SHA256
`2563acec470ec55f83e1578901c59138a8ae73814061e16d773919f9174905db`.
See `provenance.json` and `checksums.sha256` for the full file fingerprint.

## Demo behavior

Data is fixed and fixture-only. Supported edits and staging simulations remain in
browser storage and can be reset. Authentication, production publishing, remote
metadata, and new-site uploads are unavailable. Reader PIN `1234` is a labeled
local simulation. All exported HTML has noindex metadata.

## Local preview

From this repository, run `python3 -m http.server 8088 --directory public`, then
open `http://localhost:8088/handover-concept-demo/`. Python's server does not apply
Vercel's root redirect, so use the prefixed URL. Verify bundle files with
`shasum -a 256 -c checksums.sha256`.

## Hosting status

Private GitHub destination: `https://github.com/razmatas/handover-2-prototype`.
Vercel hosting is pending and paused after project creation returned 403. No live
Vercel URL exists. Handover publication remains paused. This local preparation
makes no remote push, deployment, or publication attempt.
