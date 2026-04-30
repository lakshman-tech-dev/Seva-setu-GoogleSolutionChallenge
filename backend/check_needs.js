require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data, error } = await supabase.from('community_needs').select('id, category, status').limit(20);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
