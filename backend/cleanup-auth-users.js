import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function deleteAllAuthUsers() {
  let page = 1;
  const perPage = 100;
  let totalDeleted = 0;

  console.log('🚨 Starting Supabase Auth cleanup...\n');

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw error;
    }

    const users = data.users;

    if (!users || users.length === 0) {
      break;
    }

    console.log(`Page ${page}: found ${users.length} users`);

    for (const user of users) {
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(`❌ Failed: ${user.email || user.id}`);
        console.error(deleteError.message);
        continue;
      }

      totalDeleted++;

      console.log(
        `✅ Deleted ${totalDeleted}: ${user.email || user.id}`
      );
    }

    page++;
  }

  console.log('\n================================');
  console.log(`✅ TOTAL DELETED: ${totalDeleted}`);
  console.log('================================');
}

deleteAllAuthUsers().catch((error) => {
  console.error('\n❌ Cleanup failed:');
  console.error(error.message);
  process.exit(1);
});