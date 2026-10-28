import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'WillD Hub · Seu cardápio, em todo lugar', description: 'Gerencie seu cardápio e suas integrações de delivery em um só lugar.' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>;}
