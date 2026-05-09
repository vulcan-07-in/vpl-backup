import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("Starting forced import...");

        console.log("Deleting old registrations...");
        await supabase.from('vpl_registrations').delete().neq('account_id', '0');
        await supabase.from('varchasva_accounts').delete().neq('account_id', '0');

        const rawPlayers = [
            { name: "Yash Rindhe", mobile: "8668294529", role: "All" },
            { name: "Atharva Bhanushali", mobile: "7304218696", role: "Moral Support" },
            { name: "Laxmikant Patil", mobile: "8766044711", role: "All" },
            { name: "Ojas patil", mobile: "7666076414", role: "All" },
            { name: "Rushikesh Janardhan Kadam", mobile: "7276064548", role: "All" },
            { name: "Shivam Karande", mobile: "9325043463", role: "All" },
            { name: "Vedant Vinod Gavali", mobile: "9673972526", role: "All" },
            { name: "Vedant Bule", mobile: "8830966513", role: "Bowler" },
            { name: "AMRUTA WAGHMODE", mobile: "7447227550", role: "All" },
            { name: "Vedanti Rajesh parikh", mobile: "7276940718", role: "Batsman" },
            { name: "Arushi Khandelwal", mobile: "7758967822", role: "All" },
            { name: "Pranoti danao", mobile: "8317219702", role: "Bowler, Moral Support" },
            { name: "Eka Desai", mobile: "8308050873", role: "Bowler" },
            { name: "Tanishka Nikam", mobile: "9028512554", role: "All" },
            { name: "Hiral Badgujar", mobile: "8602369818", role: "All" },
            { name: "Niyati B. Gholap", mobile: "8766953713", role: "Batsman" },
            { name: "Shrawani Kate", mobile: "9270294540", role: "All" },
            { name: "Aditi Patil", mobile: "7038578793", role: "All" },
            { name: "Tanvi Gagare", mobile: "8265043701", role: "Batsman" },
            { name: "Riya Gadodia", mobile: "8483990247", role: "All" },
            { name: "Riya Dalvi", mobile: "8329921430", role: "Bowler" },
            { name: "Disha Dinkar Nagargoje", mobile: "7972742122", role: "Moral Support" },
            { name: "Sharayu Sunkarwar", mobile: "7448081818", role: "Batsman, Bowler, All" },
            { name: "Purva Bhagwat", mobile: "9145346151", role: "All" },
            { name: "Anoushka Modi", mobile: "9082198532", role: "All" },
            { name: "Swara Jain", mobile: "8766953713", role: "Batsman" },
            { name: "Nancy Patil", mobile: "7304366061", role: "All" },
            { name: "Aditi Waghmode", mobile: "7219642201", role: "Bowler" },
            { name: "Tanvi Talmale", mobile: "9699528306", role: "Bowler, Moral Support" },
            { name: "Aarushi Singh", mobile: "+919325070244", role: "All" },
            { name: "Janhvi Bondarde", mobile: "7972560585", role: "Batsman" },
            { name: "Krishna Bobade", mobile: "9272097004", role: "Moral Support" },
            { name: "Tanushree Sorate", mobile: "7020485424", role: "All" },
            { name: "Prachi Gunnal", mobile: "8767790802", role: "All, Moral Support" },
            { name: "Bhavinee Shree", mobile: "9816788944", role: "Batsman" },
            { name: "Prajkta Nawale", mobile: "8080565316", role: "Batsman" },
            { name: "Saniya Pajai", mobile: "7517818384", role: "Bowler, Moral Support" },
            { name: "Swara Jain 2", mobile: "+918879809869", role: "All" },
            { name: "Raashi Palod", mobile: "9226286514", role: "All" },
            { name: "Shrawani tapare", mobile: "9423223991", role: "All" },
            { name: "Apoorv Wakchaure", mobile: "9890406969", role: "Moral Support" },
            { name: "Aditya Rathod", mobile: "9356710062", role: "All" },
            { name: "Piyush jankar", mobile: "8767245901", role: "All" },
            { name: "Shubham Chavan", mobile: "7249406397", role: "Bowler" },
            { name: "Sarvesh More", mobile: "9920106345", role: "All" },
            { name: "Atharva singh", mobile: "72195510141", role: "All" },
            { name: "VIKASH SAINI", mobile: "6367409164", role: "Bowler" },
            { name: "Harish Pingle", mobile: "9699240236", role: "All" },
            { name: "Vikramsingh Rathod", mobile: "9029022332", role: "All" },
            { name: "Piyush Deshmukh", mobile: "9970794350", role: "All" },
            { name: "Kundan Chinchole", mobile: "8208712217", role: "Batsman, Bowler" },
            { name: "Yug Mahavir Jain", mobile: "72726216268", role: "All" },
            { name: "Prathmesh Suresh Naik", mobile: "8530436730", role: "Batsman, Bowler, All" },
            { name: "Abhinav Gunjate", mobile: "7249675598", role: "Moral Support" },
            { name: "Devansh Dhanure", mobile: "9028896508", role: "All" },
            { name: "Vedant Shah", mobile: "9323236144", role: "Moral Support" },
            { name: "Devansh Bodalawar", mobile: "9623021858", role: "All" },
            { name: "Rohan Chaudhari", mobile: "8208221190", role: "All" },
            { name: "Yameen Jamadar", mobile: "7666940355", role: "All" },
            { name: "Dhruv Kadam", mobile: "7887601765", role: "All" },
            { name: "Aditya Prashant Gambhire", mobile: "7058385767", role: "All" },
            { name: "Siddhant Vinod Pardeshi", mobile: "8446123299", role: "All" },
            { name: "Kishor Patil", mobile: "9270112039", role: "All, Moral Support" },
            { name: "Devanshu Gomkale", mobile: "8767906173", role: "Bowler, Moral Support" },
            { name: "Jyotiraditya kalekar", mobile: "9146655699", role: "All" },
            { name: "Saksham jain", mobile: "7588593823", role: "All" },
            { name: "Kushaagra Mani", mobile: "9370612345", role: "All" },
            { name: "Raj Nitin Shinde", mobile: "8149609106", role: "All" },
            { name: "Ajinkya Mamankar", mobile: "8080997684", role: "All" },
            { name: "Dipesh Katpal", mobile: "+919322966744", role: "Batsman, Bowler, All" },
            { name: "Tanmay Tandale", mobile: "9960797017", role: "All" },
            { name: "Atharva nilak", mobile: "9604374347", role: "All" },
            { name: "Shoaib Shaikh", mobile: "9529314463", role: "Moral Support" },
            { name: "Atharva karke", mobile: "7841948978", role: "All" },
            { name: "chaitanya bhosale", mobile: "7887367272", role: "All" },
            { name: "Chaitanya Dhobale", mobile: "9423192991", role: "Bowler" },
            { name: "Arnav Kadhane", mobile: "9834467014", role: "Bowler" }
        ];

        let currentIdCounter = 1;
        let successCount = 0;
        
        const usedMobiles = new Set();
        const results = [];
        let firstError = null;

        for (const player of rawPlayers) {
            let cleanMobile = player.mobile.replace(/[^0-9]/g, '');
            if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
                cleanMobile = cleanMobile.substring(2);
            }
            if (cleanMobile.length > 10) {
                 cleanMobile = cleanMobile.substring(0, 10);
            }
            
            // Deduplicate logic
            if (usedMobiles.has(cleanMobile)) {
                 cleanMobile = cleanMobile + "DUP" + currentIdCounter;
            }
            usedMobiles.add(cleanMobile);

            const accountId = `VAR-${currentIdCounter.toString().padStart(3, '0')}`;
            currentIdCounter++;

            // Upsert account
            const { error: accErr } = await supabase.from('varchasva_accounts').upsert({
                account_id: accountId,
                name: player.name,
                mobile_number: cleanMobile
            });

            if (accErr) {
                if (!firstError) firstError = accErr;
                console.error(`Failed to insert account ${player.name}:`, accErr);
                continue;
            }

            // Upsert registration
            const { error: regErr } = await supabase.from('vpl_registrations').upsert({
                registration_id: `VPL2-${accountId}`,
                account_id: accountId,
                season: 2,
                team_name: 'UNSOLD',
                role: player.role
            });

            if (regErr) {
                if (!firstError) firstError = regErr;
                console.error(`Failed to insert registration ${player.name}:`, regErr);
            } else {
                successCount++;
                results.push({ name: player.name, cleanMobile, accountId });
            }
        }

        return NextResponse.json({ 
            status: "SUCCESS",
            message: `Successfully inserted ${successCount} players.`,
            debug_total_raw: rawPlayers.length,
            first_error: firstError,
            players: results
        });
        
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
