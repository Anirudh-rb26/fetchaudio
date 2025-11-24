import "./globals.css";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";

const ubuntu = Roboto({
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Fetch/Audio",
  description: "Fetch Audio files via Cosine Search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${ubuntu.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
