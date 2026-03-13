const res = await fetch('https://docs.google.com/spreadsheets/d/12cbvXQkyWZWor1EYPCUljKi6so1-CANOgyQUzwZFgro/export?format=csv&gid=1008778926');
const text = await res.text();
console.log(text);
