import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkOrigin, dbError, failure, HttpError, requireAdmin, readJson } from '@/lib/server/access';
import { restaurantSchema } from '@/lib/validation';
type Params={params:Promise<{resource:string}>};
export async function GET(req:NextRequest,{params}:Params) {
 try {
  const {db}=await requireAdmin(); const {resource}=await params;
  if(!['restaurants','profiles','memberships','plans','subscriptions','integrations','publications','error_logs','audit_logs'].includes(resource)) throw new HttpError(404,'Módulo não encontrado.');
  const {data,error}=await db.from(resource).select('*').limit(500); dbError(error);
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}
}
export async function POST(req:NextRequest,{params}:Params) {
 try {
  checkOrigin(req);const {db}=await requireAdmin();const {resource}=await params;
  if(resource!=='restaurants') throw new HttpError(404,'Módulo não encontrado.');
  const {plan_id,...values}=z.record(z.string(),z.unknown()).parse(await readJson(req));z.string().uuid().parse(plan_id);
  const input=restaurantSchema.parse(values);
  const {data,error}=await db.rpc('create_restaurant',{details:input,selected_plan:plan_id}); dbError(error);
  return NextResponse.json({id:data},{status:201});
 }catch(error){return failure(error);}
}
export async function PATCH(req:NextRequest,{params}:Params) {
 try {
  checkOrigin(req);const {db}=await requireAdmin();const {resource}=await params;
  const body=await readJson(req);
  if(resource==='restaurants') {
   const {id,status}=z.object({id:z.string().uuid(),status:z.enum(['active','suspended'])}).strict().parse(body);
   const {data,error}=await db.from('restaurants').update({status}).eq('id',id).select('id'); dbError(error);
   if(!data?.length) throw new HttpError(404,'Restaurante não encontrado.');
  } else if(resource==='subscriptions') {
   const input=z.object({restaurant_id:z.string().uuid(),plan_id:z.string().uuid(),status:z.enum(['trialing','active','past_due','canceled']),current_period_end:z.string().datetime(),trial_ends_at:z.string().datetime().nullable()}).strict().refine(s=>s.status!=='trialing'||s.trial_ends_at!==null,{message:'Informe o fim do período de teste.'}).parse(body);
   const {error}=await db.from('subscriptions').upsert(input,{onConflict:'restaurant_id'}); dbError(error);
  } else if(resource==='plans') {
   const {id,...values}=z.object({id:z.string().uuid(),name:z.string().min(2).max(80),monthly_price:z.number().min(0).max(100000),product_limit:z.number().int().min(1).max(100000),publication_limit:z.number().int().min(1).max(100000),integration_limit:z.number().int().min(1).max(2),trial_days:z.number().int().min(1).max(365),features:z.array(z.string().max(200)).max(20)}).strict().parse(body);
   const {data,error}=await db.from('plans').update(values).eq('id',id).select('id');dbError(error);
   if(!data?.length)throw new HttpError(404,'Plano não encontrado.');
  } else throw new HttpError(404,'Módulo não encontrado.');
  return NextResponse.json({ok:true});
 }catch(error){return failure(error);}
}
