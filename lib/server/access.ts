import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { authorizedTenant, type Action, type Role } from '@/lib/permissions';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== req.nextUrl.origin) throw new HttpError(403, 'Origem da requisição não autorizada.');
  if (Number(req.headers.get('content-length') ?? 0) > 32768) throw new HttpError(413, 'Requisição muito grande.');
}
export async function readJson(req: NextRequest): Promise<unknown> {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415,'Envie dados no formato JSON.');
  const reader=req.body?.getReader();
  if(!reader)throw new HttpError(400,'Requisição vazia.');
  let size=0;const chunks:Uint8Array[]=[];
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new HttpError(413,'Requisição muito grande.');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'JSON inválido.');}
  }finally{reader.releaseLock();}
}
export async function session() {
  const db = await supabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new HttpError(401, 'Faça login para continuar.');
  const { data: profile } = await db.from('profiles').select('id,name,platform_role').eq('id', user.id).single();
  if (!profile) throw new HttpError(403, 'Perfil não encontrado.');
  return { db, user, profile };
}
export async function requireAdmin() {
  const context = await session();
  if (context.profile.platform_role !== 'SUPER_ADMIN') throw new HttpError(403, 'Acesso exclusivo da administração.');
  return context;
}
export async function tenant(restaurantId: string, action: Action = 'read') {
  const context = await session();
  const { data: restaurant } = await context.db.from('restaurants').select('*').eq('id', restaurantId).single();
  if (!restaurant) throw new HttpError(404, 'Estabelecimento não encontrado.');
  const { data: membership } = await context.db.from('memberships').select('*').eq('restaurant_id', restaurantId).eq('user_id', context.user.id).single();
  const role: Role = context.profile.platform_role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : membership?.role;
  if (!authorizedTenant({ userId: context.user.id, restaurantId, restaurantStatus: restaurant.status, role, membershipUserId: membership?.user_id, membershipRestaurantId: membership?.restaurant_id }, action)) throw new HttpError(403, 'Você não tem permissão para esta operação.');
  return { ...context, restaurant, role };
}
export function dbError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '23505') throw new HttpError(409, 'Este registro já existe.');
  if (error.code === '23503') throw new HttpError(409, 'Registro relacionado inválido ou ainda em uso.');
  if (error.code === '42501' || error.code === 'P0001') throw new HttpError(403, 'Operação bloqueada: verifique as permissões, assinatura e limites do plano.');
  throw new HttpError(400, 'Não foi possível salvar. Verifique os dados e tente novamente.');
}
export function failure(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({error: error.issues.map(i=>i.message).join(' ')},{status:400});
  if (error instanceof HttpError) return NextResponse.json({error:error.message},{status:error.status});
  return NextResponse.json({error:'Serviço indisponível. Verifique a configuração do servidor.'},{status:503});
}
