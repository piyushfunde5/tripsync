import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripSync - Plan Group Trips Without the Chaos",
  description: "One link. Everyone on the same page. No app install needed. RSVP, polls, expenses, itinerary — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
