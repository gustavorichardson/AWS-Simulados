import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS Simulados — CLF-C02",
  description: "Plataforma de simulados para o exame AWS Certified Cloud Practitioner com foco pedagógico e recuperação de conteúdos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
