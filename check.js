const https = require('https');
https.get('https://docs.google.com/spreadsheets/d/12cbvXQkyWZWor1EYPCUljKi6so1-CANOgyQUzwZFgro/export?format=csv&gid=1008778926', (res) => {
  let data = '';
  res.on('data', (d) => data += d);
  res.on('end', () => console.log(data));
});
