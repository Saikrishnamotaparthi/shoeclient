import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env BEFORE importing firebase config
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uid = process.argv[2];

async function run() {
  const { setAdminClaim } = await import('../utils/adminClaim');

if (!uid) {
  console.error('❌ Please provide a Firebase User UID.');
  console.error('Usage: npx tsx src/scripts/setAdmin.ts <YOUR_UID>');
  process.exit(1);
}

console.log(`Setting admin privileges for user: ${uid}...`);
setAdminClaim(uid, true).then((success) => {
  if (success) {
    console.log('✅ Admin claim set successfully! Please log out and log back in on the frontend to refresh your token.');
  }
  process.exit(success ? 0 : 1);
});
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
