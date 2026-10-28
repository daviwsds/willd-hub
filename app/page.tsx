import Hub from '@/components/hub';
import { configured } from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default function Page() {
 const demo=process.env.NEXT_PUBLIC_DEMO_MODE==='true' || (!configured() && process.env.NODE_ENV==='development');
 if(!configured() && !demo) return <main className="setup"><div className="brand-mark">w<span>↗</span></div><h1>WillD Hub</h1><p>Configure o Supabase para começar ou habilite explicitamente a demonstração.</p><p>Consulte o README do projeto para as etapas de implantação.</p></main>;
 return <Hub demo={demo}/>;
}
