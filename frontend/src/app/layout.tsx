import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Container } from "@/components/ui/container";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Unseen PNE",
  description:
    "Find the forgotten. Prove the need. Route the help. Close the loop.",
};

const setInitialTheme = `(function(){try{var t=localStorage.getItem('unseen-theme');var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var v=t||(d?'dark':'light');if(v==='dark')document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=v;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: setInitialTheme }} />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <ThemeProvider>
          <Nav />
          <main className="py-10">
            <Container>{children}</Container>
          </main>
          <footer className="border-t">
            <Container>
              <div className="flex flex-col items-center justify-between gap-2 py-6 text-xxs text-muted md:flex-row">
                <span>Configuration-driven. Citations required. Human-in-the-loop.</span>
                <span className="tabular">Unseen PNE · v0.1</span>
              </div>
            </Container>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
