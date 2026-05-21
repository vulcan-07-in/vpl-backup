"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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
        const visitorId = getOrCreateVisitorId();
        const page = pathname || "/";
        const dev = device.current;

        const ping = () => {
            fetch("/api/analytics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitorId, page, device: dev }),
                // fire-and-forget — don't block the UI
            }).catch(() => { /* silent */ });
        };

        // Immediate ping on page load / route change
        ping();

        // Heartbeat every 15 seconds to maintain "active" status
        const interval = setInterval(ping, 15_000);
        return () => clearInterval(interval);
    }, [pathname]);

    return null; // No UI
}

// ── Squad-view helper (called from squads-client.tsx) ────────────────────────
export function trackSquadView(teamName: string) {
    try {
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
