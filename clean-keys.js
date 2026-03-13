const fs = require('fs');
const path = './src/app/scorer/scorer-client.tsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Remove the declaration
code = code.replace(/const ADMIN_API_KEY = "vpl_secret_2025";\s*/g, '');

// 2. Remove the header usages
code = code.replace(/,\s*"x-vpl-internal-key":\s*ADMIN_API_KEY/g, '');
code = code.replace(/"x-vpl-internal-key":\s*ADMIN_API_KEY\s*,?\s*/g, '');

// 3. Update handleAuth (we'll replace the body)
const oldHandleAuth = `    const handleAuth = async () => {
        if (pin === "2025") { // Mock check for instant UI unlock
            setIsAuthenticated(true);
            setActiveScreen("SELECT_MATCH");
            localStorage.setItem("isScorerAuthenticated", "true");
        } else {
            alert("Incorrect PIN.");
            setPin("");
        }
    };`;

const newHandleAuth = `    const handleAuth = async () => {
        try {
            const res = await fetch('/api/scorer-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            if (res.ok) {
                setIsAuthenticated(true);
                setActiveScreen("SELECT_MATCH");
                localStorage.setItem("isScorerAuthenticated", "true");
            } else {
                alert("Incorrect PIN.");
                setPin("");
            }
        } catch (e) {
            console.error(e);
            alert("Auth failed.");
        }
    };`;

code = code.replace(oldHandleAuth, newHandleAuth);

fs.writeFileSync(path, code);
console.log("Updated scorer-client.tsx successfully.");
