# BusTrack Pro - standalone WEB app (Windows, copy-paste)

```
BusTrackPro-Web/
  client/   React website: public bus search, live map, parking, Admin dashboard
            (student and driver sections are NOT here - they live in the mobile app)
  server/   Node + MongoDB API (identical to the mobile package's backend)
```
Tested: `npm run build` compiles successfully.

## A. Run it on your PC
Terminal 1 (API):
```powershell
cd $HOME\Desktop\BusTrackPro-Web\server
Copy-Item .env.example .env
notepad .env
```
Set `MONGO_URI` (local `mongodb://127.0.0.1:27017/bustrackpro` or an Atlas string) and `JWT_SECRET`, save, then:
```powershell
npm install
npm run seed
npm run create-admin
npm run dev
```
Terminal 2 (website):
```powershell
cd $HOME\Desktop\BusTrackPro-Web\client
npm install
npm start
```
Open http://localhost:3000. Admin login uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

## B. Put it live (free)
Do the database + backend once. If you already deployed the backend from the mobile package, **reuse that same
Render service** and skip to step 3. One backend serves both the website and the apps.

1. **Database:** MongoDB Atlas free M0 cluster, add a user, allow `0.0.0.0/0`, copy the connection string
   (`...mongodb.net/bustrackpro?retryWrites=true&w=majority`). Run `npm run seed` and `npm run create-admin`
   from `server/` with that string in `.env`.
2. **Backend on Render:** push to GitHub, then Render -> New + -> Web Service -> pick the repo.
   Root Directory `server` | Build `npm install` | Start `npm start` | Free.
   Env vars: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=30d`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Check `https://YOUR-API.onrender.com/health` shows `{"ok":true}`.
3. **Website on Vercel** (or Netlify): New Project -> import the repo ->
   Root Directory `client` | Framework Create React App | Build `npm run build` | Output `build`.
   Environment variables (both, no trailing slash):
   `REACT_APP_API_URL=https://YOUR-API.onrender.com`
   `REACT_APP_SOCKET_URL=https://YOUR-API.onrender.com`
   Deploy. You get `https://YOUR-SITE.vercel.app`.
   (Netlify: base directory `client`, build command `npm run build`, publish directory `client/build`.)
4. **Allow the website to call the API (CORS):** in Render set `CLIENT_URL=https://YOUR-SITE.vercel.app`
   (exactly that, no trailing slash) and redeploy. To allow a custom domain too, comma-separate the origins:
   `CLIENT_URL=https://YOUR-SITE.vercel.app,https://www.example.com`.
5. Open the site: search a route, open Live Map, log in to Admin.

Changing the backend URL later means changing the two `REACT_APP_` variables and redeploying the site,
because React bakes them in at build time.

## Optional: browser push notifications
Generate keys with `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT=mailto:you@example.com` on the backend.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Site loads but data is empty / CORS error in browser console | `CLIENT_URL` on Render is missing or does not exactly include the site origin; redeploy after changing. |
| Calls go to the Vercel domain instead of the API | `REACT_APP_API_URL` not set at build time; set it and redeploy. |
| Map shows "offline" | `REACT_APP_SOCKET_URL` wrong, or the free Render instance is asleep (wait about a minute). |
| Admin login fails | Run `npm run create-admin` against the same database the server uses. |
| Live buses look simulated | Real GPS only appears when a driver is sharing from the mobile app. |

Never commit `.env`. Change the default admin password before sharing the site.
