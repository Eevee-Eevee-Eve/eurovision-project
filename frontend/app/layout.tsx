import "../styles/globals.css";
import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { AccountProvider } from "../components/AccountProvider";
import { ComplianceNotice } from "../components/ComplianceNotice";
import { LanguageProvider } from "../components/LanguageProvider";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const labelFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-label",
});

export const metadata: Metadata = {
  title: "Евровидение у Морозовых 2026",
  description: "Мобильное голосование Евровидения с карточками артистов, заметками и отдельными экранами для проектора.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${displayFont.variable} ${bodyFont.variable} ${labelFont.variable} bg-arenaBg text-arenaText scroll-smooth`}
    >
      <body className="antialiased">
        <LanguageProvider>
          <AccountProvider>
            {children}
            <ComplianceNotice />
          </AccountProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
