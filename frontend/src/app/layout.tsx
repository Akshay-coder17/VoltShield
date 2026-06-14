import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltShield AI — Industrial Power Quality Digital Twin",
  description:
    "Enterprise-grade multi-agent system for real-time power quality monitoring, anomaly detection, and adaptive grid stabilization with a recursive Agentic Learning Loop.",
  keywords: ["power quality", "digital twin", "AI", "grid monitoring", "anomaly detection"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
