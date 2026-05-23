# TODO

## Render backend fix (missing dist/index.js)
- [x] Inspect render.yaml + server package scripts and tsconfig output paths.
- [ ] Update `render.yaml` buildCommand to run `npm run build --prefix server` after `npm ci`.
- [ ] Redeploy backend on Render and confirm dist/index.js exists and server starts.
- [ ] If still failing, inspect build output / module format differences (ESM vs CJS) and adjust start/build accordingly.

