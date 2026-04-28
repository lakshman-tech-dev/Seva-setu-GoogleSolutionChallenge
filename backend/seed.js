// ============================================================
// seed.js — Demo data seeder for CommunityPulse
//
// Inserts sample volunteers, community needs, and clusters
// into Supabase so you can test the dashboard immediately.
//
// Usage:
//   cd backend
//   node seed.js
//
// Prerequisites:
//   - .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY
//   - Schema already applied (supabase/schema.sql)
// ============================================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─────────────────────────────────────────────────────────────
// SAMPLE VOLUNTEERS (5)
// ─────────────────────────────────────────────────────────────
const volunteers = [
  {
    name: 'Priya Sharma',
    phone: '+919876543210',
    email: 'priya@example.com',
    skills: ['medical', 'first_aid', 'counseling'],
    latitude: 28.6139,
    longitude: 77.2090,
    is_available: true,
    weekly_hour_limit: 12,
    hours_this_week: 4,
    reliability_score: 0.92,
    total_tasks_completed: 28,
  },
  {
    name: 'Rahul Verma',
    phone: '+919876543211',
    email: 'rahul@example.com',
    skills: ['driving', 'food_distribution', 'logistics'],
    latitude: 28.6200,
    longitude: 77.2100,
    is_available: true,
    weekly_hour_limit: 10,
    hours_this_week: 2,
    reliability_score: 0.88,
    total_tasks_completed: 15,
  },
  {
    name: 'Ananya Gupta',
    phone: '+919876543212',
    email: 'ananya@example.com',
    skills: ['teaching', 'tutoring', 'counseling'],
    latitude: 28.5355,
    longitude: 77.2410,
    is_available: true,
    weekly_hour_limit: 8,
    hours_this_week: 6,
    reliability_score: 0.95,
    total_tasks_completed: 42,
  },
  {
    name: 'Mohammed Irfan',
    phone: '+919876543213',
    email: 'irfan@example.com',
    skills: ['construction', 'plumbing', 'driving'],
    latitude: 28.6508,
    longitude: 77.2319,
    is_available: false,
    weekly_hour_limit: 15,
    hours_this_week: 14,
    reliability_score: 0.80,
    total_tasks_completed: 20,
  },
  {
    name: 'Kavitha Nair',
    phone: '+919876543214',
    email: 'kavitha@example.com',
    skills: ['social_work', 'psychology', 'counseling'],
    latitude: 28.5672,
    longitude: 77.2100,
    is_available: true,
    weekly_hour_limit: 10,
    hours_this_week: 0,
    reliability_score: 0.97,
    total_tasks_completed: 55,
  },
];

// ─────────────────────────────────────────────────────────────
// SAMPLE HOTSPOT CLUSTERS (2)
// ─────────────────────────────────────────────────────────────
const clusters = [
  {
    category: 'food',
    center_latitude: 28.5244,
    center_longitude: 77.2167,
    radius_meters: 800,
    report_count: 7,
    is_active: true,
  },
  {
    category: 'medical',
    center_latitude: 28.6330,
    center_longitude: 77.2195,
    radius_meters: 500,
    report_count: 4,
    is_active: true,
  },
];

// ─────────────────────────────────────────────────────────────
// SAMPLE COMMUNITY NEEDS (10)
// ─────────────────────────────────────────────────────────────
const needs = [
  {
    raw_input: 'My grandmother has not eaten since yesterday, she is alone at home near Saket metro. Phone: +919999888801',
    source_channel: 'whatsapp',
    category: 'food',
    description: 'Elderly woman living alone near Saket metro has not eaten in 24 hours. Requires immediate food delivery.',
    urgency_score: 85,
    vulnerability_flags: ['elderly', 'alone'],
    priority_score: 88.2,
    location_text: 'near Saket metro, Delhi',
    latitude: 28.5244,
    longitude: 77.2167,
    status: 'open',
  },
  {
    raw_input: 'Family of 5 with 2 small children in Rohini sector 7, no food supply for 2 days. +919999888802',
    source_channel: 'sms',
    category: 'food',
    description: 'Family with two young children in Rohini has had no food for 2 days. Urgent food assistance needed.',
    urgency_score: 92,
    vulnerability_flags: ['child'],
    priority_score: 94.1,
    location_text: 'Rohini sector 7, Delhi',
    latitude: 28.7155,
    longitude: 77.1113,
    status: 'open',
  },
  {
    raw_input: 'Disabled man in wheelchair needs help getting to hospital for dialysis in Dwarka. Contact +919999888803',
    source_channel: 'web_form',
    category: 'medical',
    description: 'Wheelchair-bound man in Dwarka needs transport assistance for dialysis appointment at hospital.',
    urgency_score: 78,
    vulnerability_flags: ['disabled'],
    priority_score: 76.5,
    location_text: 'Dwarka sector 12, Delhi',
    latitude: 28.5921,
    longitude: 77.0460,
    status: 'assigned',
  },
  {
    raw_input: 'Children in local slum not attending school, need tutoring support near Okhla. +919999888804',
    source_channel: 'web_form',
    category: 'education',
    description: 'Several children in an Okhla slum community are not attending school. Need volunteer tutoring.',
    urgency_score: 45,
    vulnerability_flags: ['child'],
    priority_score: 52.3,
    location_text: 'Okhla Phase 2, Delhi',
    latitude: 28.5355,
    longitude: 77.2710,
    status: 'open',
  },
  {
    raw_input: 'Pregnant woman with no access to prenatal care in Mayur Vihar. Very worried. +919999888805',
    source_channel: 'whatsapp',
    category: 'medical',
    description: 'Pregnant woman in Mayur Vihar without prenatal care access. Needs medical attention.',
    urgency_score: 82,
    vulnerability_flags: ['pregnant'],
    priority_score: 84.0,
    location_text: 'Mayur Vihar Phase 1, Delhi',
    latitude: 28.6087,
    longitude: 77.2976,
    status: 'open',
  },
  {
    raw_input: 'Roof collapsed in our jhuggi after rain, family of 3 exposed. Near Nehru Place. +919999888806',
    source_channel: 'sms',
    category: 'shelter',
    description: 'Family of 3 in a jhuggi near Nehru Place has lost their roof after rain. Need emergency shelter.',
    urgency_score: 90,
    vulnerability_flags: ['child'],
    priority_score: 91.0,
    location_text: 'near Nehru Place, Delhi',
    latitude: 28.5494,
    longitude: 77.2530,
    status: 'in_progress',
  },
  {
    raw_input: 'Old man found wandering confused near AIIMS, seems disoriented, no family nearby +919999888807',
    source_channel: 'voice',
    category: 'safety',
    description: 'Elderly man found disoriented and wandering near AIIMS hospital. Needs immediate assistance.',
    urgency_score: 88,
    vulnerability_flags: ['elderly', 'alone'],
    priority_score: 90.5,
    location_text: 'near AIIMS, Delhi',
    latitude: 28.5672,
    longitude: 77.2100,
    status: 'open',
  },
  {
    raw_input: 'Water supply contaminated in our colony, kids getting sick. Janakpuri area. +919999888808',
    source_channel: 'web_form',
    category: 'water',
    description: 'Contaminated water supply in Janakpuri colony causing illness among children.',
    urgency_score: 75,
    vulnerability_flags: ['child'],
    priority_score: 72.8,
    location_text: 'Janakpuri, Delhi',
    latitude: 28.6219,
    longitude: 77.0803,
    status: 'open',
  },
  {
    raw_input: 'Young woman facing domestic abuse, needs safe space urgently. Lajpat Nagar. +919999888809',
    source_channel: 'whatsapp',
    category: 'safety',
    description: 'Young woman experiencing domestic abuse in Lajpat Nagar. Needs immediate safe shelter.',
    urgency_score: 95,
    vulnerability_flags: ['alone'],
    priority_score: 93.2,
    location_text: 'Lajpat Nagar, Delhi',
    latitude: 28.5700,
    longitude: 77.2373,
    status: 'open',
  },
  {
    raw_input: 'Delivered food to the elderly woman at Saket. She is fine now. Feedback: all good.',
    source_channel: 'web_form',
    category: 'food',
    description: 'Food delivered to elderly woman near Saket metro. Need resolved.',
    urgency_score: 20,
    vulnerability_flags: ['elderly'],
    priority_score: 15.0,
    location_text: 'Saket, Delhi',
    latitude: 28.5250,
    longitude: 77.2150,
    status: 'completed',
    beneficiary_feedback: 'yes',
    resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding CommunityPulse demo data…\n');

  // 1. Volunteers
  console.log('👥 Inserting 5 volunteers…');
  const { data: vols, error: volErr } = await supabase
    .from('volunteers')
    .upsert(volunteers, { onConflict: 'phone' })
    .select('id, name');

  if (volErr) {
    console.error('❌ Volunteer insert failed:', volErr.message);
  } else {
    vols.forEach((v) => console.log(`   ✅ ${v.name} (${v.id})`));
  }

  // 2. Clusters
  console.log('\n🔥 Inserting 2 hotspot clusters…');
  const { data: cls, error: clErr } = await supabase
    .from('hotspot_clusters')
    .insert(clusters)
    .select('id, category, report_count');

  if (clErr) {
    console.error('❌ Cluster insert failed:', clErr.message);
  } else {
    cls.forEach((c) => console.log(`   ✅ ${c.category} cluster (${c.report_count} reports)`));
  }

  // 3. Assign cluster_id to food needs if cluster was created
  const foodClusterId = cls?.find((c) => c.category === 'food')?.id;

  // 4. Community needs
  console.log('\n📥 Inserting 10 community needs…');
  const needsToInsert = needs.map((n) => {
    if (n.category === 'food' && n.status === 'open' && foodClusterId) {
      return { ...n, cluster_id: foodClusterId };
    }
    return n;
  });

  // Assign volunteer to the 'assigned' need
  const assignedVol = vols?.find((v) => v.name === 'Rahul Verma');
  const needsWithAssignment = needsToInsert.map((n) => {
    if (n.status === 'assigned' && assignedVol) {
      return { ...n, assigned_volunteer_id: assignedVol.id };
    }
    return n;
  });

  const { data: savedNeeds, error: needErr } = await supabase
    .from('community_needs')
    .insert(needsWithAssignment)
    .select('id, category, status, priority_score');

  if (needErr) {
    console.error('❌ Needs insert failed:', needErr.message);
  } else {
    savedNeeds.forEach((n) =>
      console.log(`   ✅ ${n.category} (${n.status}) — priority: ${n.priority_score}`)
    );
  }

  // 5. Insert feedback for the completed need
  const completedNeed = savedNeeds?.find((n) => n.status === 'completed');
  if (completedNeed) {
    console.log('\n📝 Inserting beneficiary feedback…');
    const { error: fbErr } = await supabase
      .from('beneficiary_feedback')
      .insert({ need_id: completedNeed.id, response: 'yes' });

    if (fbErr) {
      console.error('❌ Feedback insert failed:', fbErr.message);
    } else {
      console.log('   ✅ Positive feedback for completed food need');
    }
  }

  // 6. Create a task for the assigned need
  const assignedNeed = savedNeeds?.find((n) => n.status === 'assigned');
  if (assignedNeed && assignedVol) {
    console.log('\n📋 Creating task for assigned need…');
    const { error: taskErr } = await supabase
      .from('tasks')
      .insert({
        need_id: assignedNeed.id,
        volunteer_id: assignedVol.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      });

    if (taskErr) {
      console.error('❌ Task insert failed:', taskErr.message);
    } else {
      console.log(`   ✅ Task: ${assignedVol.name} → ${assignedNeed.category} need`);
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log('   Open http://localhost:5173 to see the dashboard');
  console.log('   Open http://localhost:5173/volunteer for the volunteer PWA\n');
}

seed().catch((err) => {
  console.error('💥 Seed script failed:', err);
  process.exit(1);
});
