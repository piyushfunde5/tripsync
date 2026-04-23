import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripSync — Group trips, finally sorted",
  description: "Polls, itinerary, tasks and splits — in one warm little place your group will actually open.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: 'var(--ts-paper)', color: 'var(--ts-ink)' }}>
        {children}
      </body>
    </html>
  );
}
