"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function isBot(): boolean {
    if (typeof window === "undefined") return true;
    const ua = navigator.userAgent.toLowerCase();
    
    // Detect automation tools (Selenium, Playwright, Puppeteer, Cypress, etc.)
    if (navigator.webdriver) return true;
    
    // Check for common crawler and bot signatures in User-Agent
    const botKeywords = [
        "bot", "crawler", "spider", "lighthouse", "chrome-lighthouse", 
        "prerender", "headless", "selenium", "puppeteer", "playwright",
        "axios", "curl", "wget", "uptime", "pingdom", "lately", 
        "semrush", "ahrefs", "screaming", "googlebot", "bingbot", 
        "yandex", "baidu", "facebookexternalhit", "twitterbot", 
        "linkedinbot", "discordbot", "telegrambot", "slackbot"
    ];
    
    return botKeywords.some(keyword => ua.includes(keyword));
}

function getDeviceType(): string {
    if (typeof window === "undefined") return "Desktop";
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
    if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return "Mobile";
    return "Desktop";
}

function getOrCreateVisitorId(): string {
    try {
        let id = localStorage.getItem("vpl_visitor_id");
        if (!id) {
            id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            localStorage.setItem("vpl_visitor_id", id);
        }
        return id;
    } catch {
        return `v-${Date.now()}-anon`;
    }
}

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const device = useRef<string>("Desktop");

    useEffect(() => {
        device.current = getDeviceType();
    }, []);

    useEffect(() => {
        // Stop tracker immediately if client is identified as a bot
        if (isBot()) return;

        const visitorId = getOrCreateVisitorId();
        const page = pathname || "/";
        const dev = device.current;

        const ping = () => {
            // Avoid logging views when the user is not actively viewing the tab (minimized or background)
            if (document.visibilityState !== "visible") return;

            fetch("/api/analytics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitorId, page, device: dev }),
            }).catch(() => { /* silent */ });
        };

        // Immediate ping on page load / route change
        fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId, page, device: dev }),
        }).catch(() => { /* silent */ });

        // Heartbeat every 15 seconds to maintain "active" status, only if active and visible
        const interval = setInterval(ping, 15_000);
        return () => clearInterval(interval);
    }, [pathname]);

    return null; // No UI
}

// ── Squad-view helper (called from squads-client.tsx) ────────────────────────
export function trackSquadView(teamName: string) {
    try {
        if (isBot()) return;
        const visitorId = getOrCreateVisitorId();
        fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                visitorId,
                page: "/squads",
                device: getDeviceType(),
                action: "squad_view",
                team: teamName,
            }),
        }).catch(() => { /* silent */ });
    } catch { /* silent */ }
}
