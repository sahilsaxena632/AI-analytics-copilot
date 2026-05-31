import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Analytics Copilot",
  description: "Ask questions, run read-only SQL, and build manager dashboards.",
};

// Runs before paint to set theme attributes from storage and avoid a flash of the wrong theme.
const themeInitScript = `(function(){try{var m=localStorage.getItem('analytics-copilot-mode');var a=localStorage.getItem('analytics-copilot-accent');var legacy=localStorage.getItem('analytics-copilot-theme');if(!m){m=legacy==='light'?'light':'dark';}if(['dark','light','system'].indexOf(m)<0){m='dark';}if(!a){a=legacy==='green'?'emerald':'blue';}var resolved=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;var el=document.documentElement;el.setAttribute('data-mode',resolved);el.setAttribute('data-accent',a);el.classList.toggle('dark',resolved==='dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-mode="dark" data-accent="blue" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
