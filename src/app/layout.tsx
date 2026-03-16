import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Einkaufshilfe",
  description: "Einfache Einkaufshilfe für die Familie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
