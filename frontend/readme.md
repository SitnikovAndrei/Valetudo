# Valetudo Frontend

This is the Valetudo frontend written in React.

## Getting started

Install dependencies with `npm ci` at the repository root, then start a local Valetudo backend
(for example, using the MockValetudoRobot implementation).

- `npm run dev --workspace=frontend` starts the Vite server on `127.0.0.1:5173` and proxies API requests to the backend on port 80. Set `VALETUDO_DEV_BACKEND` (for example, `http://127.0.0.1:8080`) to use another backend address.
- `npm run watch --workspace=frontend` rebuilds `frontend/build` after changes, for use through the backend's web server.
- `npm run build --workspace=frontend` creates the production files in `frontend/build`.
- `npm run build_stats --workspace=frontend` creates `frontend/build/bundle-stats.html`; `npm run analyze_stats --workspace=frontend` opens it through Vite preview.

The production build uses relative asset paths so it can be served directly by Valetudo or from a subpath behind a reverse proxy.
