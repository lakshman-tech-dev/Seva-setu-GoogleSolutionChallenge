require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const team = [
  { name: 'Tanuja', email: 'tanuja@communitypulse.org', role: 'coordinator', org: 'Red Cross India', phone: '+91 90000 00001' },
  { name: 'Lakshman', email: 'lakshman@communitypulse.org', role: 'coordinator', org: 'Seva Foundation', phone: '+91 90000 00002' },
  { name: 'Purnima', email: 'purnima@example.com', role: 'volunteer', skills: ['Medical', 'First Aid'], phone: '+91 90000 00003' },
  { name: 'Chakri', email: 'chakri@example.com', role: 'volunteer', skills: ['Driving', 'Logistics'], phone: '+91 90000 00004' }
];

async function seedTeam() {
  console.log('🚀 Seeding CommunityPulse Team Data...\n');

  for (const member of team) {
    console.log(`👤 Processing ${member.name} (${member.role})...`);

    // 1. Create user in Auth
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: 'TeamPassword@123',
      email_confirm: true,
      user_metadata: {
        full_name: member.name,
        role: member.role,
        phone: member.phone,
        skills: member.role === 'volunteer' ? member.skills : [],
        organization: member.role === 'coordinator' ? member.org : ''
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`   ℹ️ User ${member.email} already exists.`);
      } else {
        console.error(`   ❌ Auth Error for ${member.name}:`, authError.message);
        continue;
      }
    } else {
      console.log(`   ✅ Auth user created for ${member.name}`);
    }

    // 2. Fetch the user to get ID (if they already existed)
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === member.email);

    if (user) {
      // 3. Manually upsert role to ensure it's correct (trigger might have handled it, but this is safe)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          id: user.id,
          role: member.role,
          full_name: member.name,
          phone: member.phone,
          skills: member.role === 'volunteer' ? member.skills : [],
          organization: member.role === 'coordinator' ? member.org : ''
        }, { onConflict: 'id' });

      if (roleError) {
        console.error(`   ❌ Role Error for ${member.name}:`, roleError.message);
      } else {
        console.log(`   ✅ Role set to ${member.role} for ${member.name}`);
      }
    }
  }

  console.log('\n🎉 Team seeding complete!');
  console.log('🔑 Default Password for all: TeamPassword@123');
}

seedTeam();
