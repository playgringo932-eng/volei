import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1d4ed8',
};

export const metadata: Metadata = {
  title: 'VoleiAraça - Sistema Oficial de Gestão e Presença da Academia de Vôlei',
  description: 'Gestão profissional de turmas de vôlei (07 a 17 anos), controle de frequência em tempo real para instrutores, relatórios mensais, exportação Excel e avisos aos responsáveis.',
  openGraph: {
    title: 'VoleiAraça - Sistema Oficial de Gestão e Presença da Academia de Vôlei',
    description: 'Gestão profissional de turmas de vôlei (07 a 17 anos), controle de frequência em tempo real para instrutores, relatórios mensais, exportação Excel e avisos aos responsáveis.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoleiAraça - Sistema Oficial de Gestão e Presença da Academia de Vôlei',
    description: 'Gestão profissional de turmas de vôlei (07 a 17 anos), controle de frequência em tempo real para instrutores, relatórios mensais, exportação Excel e avisos aos responsáveis.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full bg-slate-50 text-slate-900 antialiased">
      <body className="min-h-full flex flex-col selection:bg-blue-600 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
