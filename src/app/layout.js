import "./globals.css";
import WhatsAppButton from "../components/WhatsAppButton";

export const metadata = {
  title: "ODYSS3D - Impresión 3D, Diseño y Fabricación",
  description:
    "Fabricamos tus ideas con impresión 3D, diseño, prototipado y fabricación de precisión. De la pantalla al objeto real.",
  icons: {
    icon: "/images/branding/logo-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
