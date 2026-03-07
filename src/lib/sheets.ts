import { google } from "googleapis";
import { SHEET_ID } from "@/lib/tournament";

function getAuth() {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        throw new Error("Environment variable GOOGLE_SERVICE_ACCOUNT_JSON is missing. Check your Vercel Project Settings.");
    }

    let credentials: Record<string, string>;
    try {
        // Remove any unintentional whitespace/newlines at start/end
        credentials = JSON.parse(raw.trim());
    } catch (e) {
        console.error("JSON Parse Error on GOOGLE_SERVICE_ACCOUNT_JSON:", e);
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Ensure it's a single line and no characters were missed during copy-paste.");
    }

    // Fix: private_key in env vars often loses real newlines — restore them
    if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }

    return new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
}

export async function readSheet(range: string): Promise<string[][]> {
    const auth = await getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range,
    });
    return (res.data.values as string[][]) ?? [];
}

export async function writeSheet(range: string, values: string[][]): Promise<void> {
    const auth = await getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: { values },
    });
}

export async function clearSheet(range: string): Promise<void> {
    const auth = await getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range,
    });
}
