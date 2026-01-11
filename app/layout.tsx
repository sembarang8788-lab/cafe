import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cak Yusop - Premium Management System",
  description: "Premium Cafe Management System with POS, Inventory, and Analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
