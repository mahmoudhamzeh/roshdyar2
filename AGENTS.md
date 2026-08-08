# راهنمای توسعه پروژه

این پروژه شامل دو بخش اصلی است:

1.  **`client`**: اپلیکیشن فرانت‌اند که با React نوشته شده است.
2.  **`server`**: اپلیکیشن بک‌اند که با Node.js و Express ساخته شده است.

## دستورالعمل‌های راه‌اندازی

برای راه‌اندازی کامل پروژه، دستورات زیر را در ترمینال اجرا کنید:

```bash
# نصب وابستگی‌های سرور
npm install --prefix server

# نصب وابستگی‌های کلاینت
npm install --prefix client
```

## اجرای پروژه

برای اجرای همزمان هر دو بخش پروژه، دو ترمینال جداگانه باز کرده و دستورات زیر را اجرا کنید:

**ترمینال ۱ (برای سرور):**

```bash
npm run dev --prefix server
```

**ترمینال ۲ (برای کلاینت):**

```bash
npm start --prefix client
```

سرور روی پورت `5000` و کلاینت روی پورت `3000` اجرا خواهد شد.

## Cursor Cloud specific instructions

Dependencies are refreshed automatically on VM startup by the environment update script (`npm install` for both `server` and `client`), so you normally don't need to install anything manually. Standard run commands are already documented above and in each `package.json`.

Non-obvious notes for this codebase:

- **Backend "database" is a JSON file.** The server uses `server/db.json` as its store (loaded/saved in `server/server.js`); there is no external database, cache, or queue to run. Data written during testing persists to `server/db.json`.
- **Seeded admin account:** username `admin`, password `admin` (in `server/db.json`). Use it to log in and reach the dashboard/admin panel.
- **API base URL is hardcoded.** The React client calls `http://localhost:5000` directly (see `client/src/components/*.js`); it is not configurable via env. The server must run on port `5000` and the client on `3000` for the app to work end to end.
- **Node 22 + react-scripts 4 (OpenSSL).** The client's `start`/`build` scripts already pass `--openssl-legacy-provider`, which is required for react-scripts 4.0.3 to compile on this Node version. Don't remove it. When starting the client non-interactively, set `BROWSER=none` to stop it from trying to launch a browser.
- **No real lint/test suites.** `client` has no test files (`npm test --prefix client` just starts CRA/Jest watch mode); ESLint runs implicitly via react-scripts during `start`/`build`. The `server` has no tests.
- **Vendored `node_modules`.** `node_modules` is committed to the repo. Avoid staging changes under `node_modules/` (including `node_modules/.package-lock.json`) when committing.
- **Stray `client/client` folder** is a leftover artifact and is not used by the app; ignore it.
