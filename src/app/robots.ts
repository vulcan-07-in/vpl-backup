import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://varchasva-premier-league.vercel.app";
    
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/api"],
            },
            {
                userAgent: [
                    "GPTBot",
                    "ChatGPT-User",
                    "Google-Extended",
                    "ClaudeBot",
                    "PerplexityBot",
                    "Anthropic-AI",
                    "OAI-SearchBot"
                ],
                allow: "/",
            }
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
