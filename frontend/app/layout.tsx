import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/state/AppState";
import { AuthProvider } from "@/state/AuthState";
import AppShell from "@/components/AppShell";

// Fredoka for headings, buttons, chips and numbers; Nunito for everything else.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Roster | Job marketplace",
  description: "Search roles by skills, location, and preferences — or source candidates for your openings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-ink-2">
        <AuthProvider>
          <AppStateProvider>
            <AppShell>{children}</AppShell>
          </AppStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
