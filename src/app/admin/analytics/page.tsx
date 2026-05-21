import { Metadata } from "next";
import AnalyticsDashboard from "./analytics-client";

export const metadata: Metadata = {
    title: "VPL Viewer Analytics",
};

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
    return <AnalyticsDashboard />;
}
