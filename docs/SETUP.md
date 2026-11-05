# Setup

## 1. Local development

```bash
npx npm@11 install
cp apps/web/.env.example apps/web/.env.local   # optional, see below
npm run dev
```

Everything works without credentials in **local mode**.

## 2. Firebase (accounts + cloud data)

1. Create a Firebase project (choose an **EU** location for Firestore and Storage).
2. Add a **Web app** in Project settings and copy its config into `apps/web/.env.local`:
   `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._APP_ID`.
3. Authentication → Sign-in method: enable **Email/Password** and **Google**. Add your domains to *Authorized domains*.
4. Create the Firestore database and Storage bucket.
5. Deploy the security rules from the repository root:
   ```bash
   cp .firebaserc.example .firebaserc   # put your project id in it
   npx firebase login
   npx firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
6. Optional but recommended: App Check with reCAPTCHA Enterprise → put the site key in `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`, verify traffic, then enforce.

### Firebase emulators (no real project needed)

```bash
npm run test:rules                          # rules tests
npm run test:e2e:firebase -w @wattwise/web  # full browser flow in Firebase mode
```
To develop against emulators manually: `npx firebase emulators:start --project demo-wattwise` and set `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true` with any `demo-` project id.

## 3. AI bill reading (OpenAI)

Server-side only. Set in the server environment (never with a `NEXT_PUBLIC_` prefix):

| Variable | Value |
| --- | --- |
| `OPENAI_API_KEY` | your key |
| `OPENAI_MODEL` | a current model that accepts PDF + image input and structured outputs |
| `OPENAI_BASE_URL` | optional (proxy / EU endpoint) |

The endpoint requires a signed-in Firebase user. For local development without Firebase you can set `ALLOW_ANONYMOUS_EXTRACTION=true`; it is ignored when `NODE_ENV=production`.

Before real users: sign the provider's data processing agreement and confirm data-retention settings.

## 4. Deploying the web app

Recommended: **Firebase App Hosting** (supports Next.js server routes).

1. Connect the GitHub repository in the Firebase console → App Hosting, root directory `apps/web`.
2. Store `OPENAI_API_KEY` in Secret Manager and reference it in `apps/hosting.yaml` (to be added with the first deploy), along with the public Firebase variables.
3. Build command: `npm run build` (npm 11).

Any Node host that runs `next start` works as well (Vercel, Cloud Run).
