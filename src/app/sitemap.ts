import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://varchasva-premier-league.vercel.app";
    
    const routes = ["", "/live", "/auction", "/matches", "/points", "/stats", "/squads"];
    
    return routes.map(route => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "daily" : route === "/live" || route === "/auction" ? "always" : "daily",
        priority: route === "" ? 1.0 : route === "/live" || route === "/auction" ? 0.9 : 0.8,
    }));
}
