import "./globals.css";

// Root layout — minimal shell. The [lang] layout handles <html> and <body>.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
