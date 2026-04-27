const { Client } = require('pg');

async function testConnection(url) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('SUCCESS:', url);
    await client.end();
    return true;
  } catch (e) {
    console.error('FAILED:', url, e.message);
    return false;
  }
}

async function run() {
  const urls = [
    'postgresql://postgres.dzufjnvaodzydcdtamkp:ApoorvWakchaur%23123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.dzufjnvaodzydcdtamkp:ApoorvWakchaur%23123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.dzufjnvaodzydcdtamkp:ApoorvWakchaur%23123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.dzufjnvaodzydcdtamkp:ApoorvWakchaur%23123@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
  ];
  
  for (const url of urls) {
    if (await testConnection(url)) break;
  }
}

run();
