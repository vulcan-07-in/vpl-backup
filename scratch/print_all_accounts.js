const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://dzufjnvaodzydcdtamkp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U');

async function test() {
    const { data: accounts } = await supabase.from('varchasva_accounts').select('name').order('name');
    console.log("All accounts in DB:");
    accounts.forEach(a => console.log(` - ${a.name}`));
}

test();
