// ============================================================
// backend/set_role.js
// Use: node set_role.js <email> <role>
// ============================================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
  console.log('Use: node set_role.js <email> <coordinator|volunteer>');
  process.exit(1);
}

async function setRole() {
  // 1. Find user by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  const targetUser = users.find(u => u.email === email);

  if (!targetUser) {
    console.error(`❌ User with email ${email} not found.`);
    process.exit(1);
  }

  // 2. Upsert role
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ id: targetUser.id, role }, { onConflict: 'id' });

  if (roleError) {
    console.error(`❌ Failed to set role:`, roleError.message);
  } else {
    console.log(`✅ User ${email} is now a ${role}!`);
  }
}

setRole();
