import { headers } from "next/headers";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "vpl_secret_2025";

export async function validateAdminRequest() {
    const headerList = await headers();
    const apiKey = headerList.get("x-vpl-internal-key");
    
    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return false;
    }
    return true;
}
