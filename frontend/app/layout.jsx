
import "./globals.css";

export const metadata = {
  title: "Quickline Homes | Your Property. Our Priority.",
  description:
    "Discover properties, manage rentals, connect landlords and tenants, coordinate maintenance, and manage rent payments with Quickline Homes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
