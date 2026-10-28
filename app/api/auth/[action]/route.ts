import { NextRequest, NextResponse } from 'next/server';
import { checkOrigin, failure, HttpError, readJson } from '@/lib/server/access';
import { supabase } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation';
export async function POST(req: NextRequest, { params }: { params: Promise<{action:string}> }) {
  try {
    checkOrigin(req);
    const db = await supabase();
    const { action } = await params;
    if(action === 'logout') { await db.auth.signOut(); return NextResponse.json({ok:true}); }
    if(action !== 'login') throw new HttpError(404,'Operação não encontrada.');
    const {email,password} = loginSchema.parse(await readJson(req));
    const {error} = await db.auth.signInWithPassword({email,password});
    if(error) throw new HttpError(401,'E-mail ou senha incorretos. Tente novamente.');
    return NextResponse.json({ok:true});
  } catch(error) { return failure(error); }
}
