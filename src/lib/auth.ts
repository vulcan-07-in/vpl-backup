import { headers, cookies } from "next/headers";

export async function validateAdminRequest() {
    // 1. Check HTTP-only cookie set by /api/scorer-auth or /api/admin/login
    const cookieStore = await cookies();
    const token = cookieStore.get("vpl_scorer_token");
    const adminPassword = process.env.ADMIN_PASSWORD ?? "1989";
    
    if (token && token.value === adminPassword) {
        return true;
    }

    // 2. Check internal API key (for server-to-server or explicit integrations)
    const headerList = await headers();
    const apiKey = headerList.get("x-vpl-internal-key");
    if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
        return true;
    }

    return false;
}
