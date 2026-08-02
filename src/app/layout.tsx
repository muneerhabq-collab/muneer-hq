import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP = process.env.NEXT_PUBLIC_APP_NAME || "منير HQ";

export const metadata: Metadata = {
  title: { default: APP, template: `%s · ${APP}` },
  description: "نظام تشغيل الحياة: اهداف، مشاريع، مهام، عادات، وكالندر - في مكان واحد",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/apple-touch-icon.png" },
  openGraph: { title: APP, description: "نظام تشغيل الحياة", images: ["/og.png"], type: "website" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: APP },
};

export const viewport: Viewport = {
  themeColor: "#1F0F25",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
