const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://dzufjnvaodzydcdtamkp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWZqbnZhb2R6eWRjZHRhbWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTg3ODUsImV4cCI6MjA5MjgzNDc4NX0.g1I8WJUEJ0kaOhCwiDXpUGR-dMYsGB4Lq4iCxmjdR9U');

async function checkAuctionHistory() {
    console.log("Checking vpl_auction_history table...");
    const { data, error } = await supabase.from('vpl_auction_history').select('*');
    if (error) {
        console.error("Error querying vpl_auction_history:", error);
    } else {
        console.log(`Found ${data.length} records in vpl_auction_history.`);
        if (data.length > 0) {
            console.log("Sample records:");
            console.log(data.slice(0, 10));
        }
    }
}

checkAuctionHistory();
