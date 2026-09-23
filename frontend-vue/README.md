# Experimental Vue frontend

This workspace implements the Vue UI alongside the existing React frontend while route parity is verified. It builds into its own ignored `frontend-vue/build` directory. The backend continues to serve the React build from `frontend/build`.

```powershell
npm ci
npm run dev --workspace=frontend-vue
npm run test --workspace=frontend-vue
npm run build --workspace=frontend-vue
```

The dev server proxies `/api`, `/_ssdp`, and `/_killswitch` to `http://127.0.0.1:80`. Set `VALETUDO_DEV_BACKEND` to use another backend URL. For a browser smoke test without a robot, start `node frontend-vue/test/fixture-server.mjs` in one terminal, then set `$env:VALETUDO_DEV_BACKEND = "http://127.0.0.1:8082"` and run the dev command in another. Set `$env:FIXTURE_EMBEDDED = "1"` before starting the fixture server to exercise Wi-Fi provisioning, or `$env:FIXTURE_RICH = "1"` for map editors, firmware option selectors and timer mutations. The fixture returns synthetic data and records accepted mutations at `/__fixture/actions`; it cannot validate robot behavior.

The Vue source imports UI-independent types and API transport from `frontend/src/api`. Route and behavior progress is tracked in `frontend/design/vue-parity-matrix.md`. Keep the two builds separate until the matrix and physical-device checks are complete.

The Vue UI starts in Russian and offers Russian and English in the header. The choice is stored in the browser as `ui-language`. Interface messages live in `src/i18n/ru.ts`, with English source text serving as the key and the English catalog generated from those keys. Robot-provided text, AI responses, and the shared Help/About articles are displayed as supplied.
