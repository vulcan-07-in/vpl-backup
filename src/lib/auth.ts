import { headers, cookies } from "next/headers";

export async function validateAdminRequest() {
    // 1. Check HTTP-only cookie set by /api/scorer-auth
    const cookieStore = await cookies();
    const scorerToken = cookieStore.get("vpl_scorer_token");
    if (scorerToken && scorerToken.value === process.env.ADMIN_PASSWORD) {
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
