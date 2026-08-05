import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { PageTransition } from "@/components/nav/page-transition";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "OpsPilot AI — NovaFoods Operations Decision Hub",
  description: "AI-powered operations decision support for NovaFoods Pvt. Ltd.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dark is the primary experience (DESIGN_SPECIFICATION.md §3.1) — the
    // full light-mode token set in globals.css stays valid and reachable
    // by simply removing this class, so light mode remains a real,
    // supported alternate rather than dead code.
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto bg-background p-6">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
