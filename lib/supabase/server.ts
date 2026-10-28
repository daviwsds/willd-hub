import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function configured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }
export async function supabase() {
  if (!configured()) throw new Error('Supabase não configurado.');
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => jar.getAll(), setAll(values) { try { values.forEach(({name,value,options}) => jar.set(name,value,{...options, httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV === 'production'})); } catch { /* Renderização somente leitura; os endpoints renovam a sessão. */ } }, },
  });
}
