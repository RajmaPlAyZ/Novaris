import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lora, Orbitron } from "next/font/google";
import "./globals.css";

import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { EdgeStoreProvider } from "@/lib/edgestore";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Novaris",
  description:
    "The seamless platform where creative and productive work happens.",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/logo.svg",
        href: "/logo.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/logo-dark.svg",
        href: "/logo-dark.svg",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${inter.variable} ${lora.variable} ${jetbrainsMono.variable} ${orbitron.variable}`}
      >
        <ClerkProvider
          appearance={{
            theme: shadcn,
          }}
        >
          <ConvexClientProvider>
            <EdgeStoreProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                storageKey="novaris-theme-2"
              >
                <ToasterProvider />
                <ModalProvider />
                {children}
              </ThemeProvider>
            </EdgeStoreProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
