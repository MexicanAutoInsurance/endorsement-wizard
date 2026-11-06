import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mexican Auto Insurance — Endorsement Wizard",
  description:
    "Staff endorsement intake and client fill-out for Lewis and Lewis / MexicanAutoInsurance.com",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
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
