// Builds the offline static bundle into apps/web/out for the native test shells.
// Server routes cannot be exported, so src/app/api is moved aside during the build.
import { execSync } from 'node:child_process';
import { existsSync, renameSync, rmSync } from 'node:fs';

const api = 'src/app/api';
const parked = 'src/.api-parked';
if (existsSync(parked)) renameSync(parked, api); // recover from an interrupted run
rmSync('out', { recursive: true, force: true });
renameSync(api, parked);
try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      WATTWISE_STATIC: '1',
      NEXT_PUBLIC_FIREBASE_API_KEY: '',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
    },
  });
} finally {
  renameSync(parked, api);
}
console.log('Static bundle ready in apps/web/out');
