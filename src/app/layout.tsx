import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald, Roboto_Condensed } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { getCurrentAdmin } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "vietnamese"],
});

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

// Narrow, tall sans for text inside the in-game windows, closest to the game's own font.
const gameFont = Roboto_Condensed({
  variable: "--font-game",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Ninjaschool Ranking",
  description: "Bảng xếp hạng Elo và lịch sử lôi đài của Ninjaschool",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Only decides which nav buttons to show; every admin page and action
  // checks the session itself.
  const admin = await getCurrentAdmin();
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${gameFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
        <NavBar isAdmin={admin !== null} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
