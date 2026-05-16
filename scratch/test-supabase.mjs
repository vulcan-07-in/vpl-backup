import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dzufjnvaodzydcdtamkp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    try {
        const { data, error } = await supabase.from('Team').select('*').limit(1);
        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Supabase Data:", data);
        }
    } catch (e) {
        console.error("Caught Error:", e);
    }
}

test();
