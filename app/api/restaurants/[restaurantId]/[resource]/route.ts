import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { tenant, checkOrigin, dbError, failure, HttpError, readJson } from '@/lib/server/access';
import { schemas, connectSchema, publishSchema, memberSchema, restaurantSchema } from '@/lib/validation';
import { encryptCredentials } from '@/lib/server/crypto';
import { connectors } from '@/lib/server/connectors';
type Params = { params: Promise<{restaurantId:string;resource:string}> };
const readable = ['products','categories','extras','hours','integrations','publications','audit_logs','subscriptions','payments','memberships'];
const editable = Object.keys(schemas);
export async function GET(req:NextRequest,{params}:Params) {
 try {
  const {restaurantId,resource}=await params;
  z.string().uuid().parse(restaurantId);
  if(!readable.includes(resource)) throw new HttpError(404,'Módulo não encontrado.');
  const {db}=await tenant(restaurantId,resource==='memberships'?'members':'read');
  let query=db.from(resource).select('*').eq('restaurant_id',restaurantId);
  if (['publications','audit_logs','payments'].includes(resource)) query=query.order('created_at',{ascending:false}).limit(200);
  const {data,error}=await query; dbError(error);
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}
}
export async function POST(req:NextRequest,{params}:Params) {
 try {
  checkOrigin(req);
  const {restaurantId,resource}=await params;
  z.string().uuid().parse(restaurantId);
  const body=await readJson(req);
  if(editable.includes(resource)) {
   const {db}=await tenant(restaurantId,'catalog');
   const input=schemas[resource as keyof typeof schemas].parse(body);
   const {data,error}=await db.from(resource).insert({...input,restaurant_id:restaurantId}).select().single(); dbError(error);
   return NextResponse.json(data,{status:201});
  }
  if(resource==='integrations') {
   const {db}=await tenant(restaurantId,'credentials');
   const input=connectSchema.parse(body);
   const encrypted=input.credentials ? encryptCredentials(input.credentials,restaurantId,input.provider) : null;
   const {error}=await db.rpc('connect_integration',{rid:restaurantId,target_provider:input.provider,encrypted_value:encrypted}); dbError(error);
   return NextResponse.json({ok:true,mode:'simulated'});
  }
  if(resource==='publications') {
   const {db}=await tenant(restaurantId,'publish');
   const input=publishSchema.parse(body);
   const {data:products,error:readError}=await db.from('products').select('name,price').eq('restaurant_id',restaurantId).eq('active',true); dbError(readError);
   const validation=connectors[input.provider].validateMenu(products??[]);
   if(!validation.valid) throw new HttpError(400,validation.errors.join(' '));
   const {data,error}=await db.rpc('publish_menu',{rid:restaurantId,target_provider:input.provider,request_key:input.request_id});
   if(error) {
    await db.rpc('record_integration_error',{rid:restaurantId,source_name:input.provider});
    dbError(error);
   }
   return NextResponse.json({id:data,mode:'simulated'},{status:201});
  }
  if(resource==='memberships') {
   const {db}=await tenant(restaurantId,'members');
   const input=memberSchema.parse(body);
   const {error}=await db.rpc('manage_member',{rid:restaurantId,uid:input.user_id,new_role:input.role}); dbError(error);
   return NextResponse.json({ok:true});
  }
  throw new HttpError(404,'Módulo não encontrado.');
 }catch(error){return failure(error);}
}
export async function PATCH(req:NextRequest,{params}:Params) {
 try {
  checkOrigin(req);
  const {restaurantId,resource}=await params;
  z.string().uuid().parse(restaurantId);
  const body=z.record(z.string(),z.unknown()).parse(await readJson(req));
  if(resource==='settings') {
   const {db}=await tenant(restaurantId,'settings');
   const input=restaurantSchema.pick({name:true,email:true,phone:true,address:true}).parse(body);
   const {error}=await db.rpc('update_restaurant',{rid:restaurantId,new_name:input.name,new_email:input.email,new_phone:input.phone,new_address:input.address}); dbError(error);
   return NextResponse.json({ok:true});
  }
  if(!editable.includes(resource)) throw new HttpError(404,'Módulo não encontrado.');
  const {db}=await tenant(restaurantId,'catalog');
  const {id,...values}=body;
  z.string().uuid().parse(id);
  const input=schemas[resource as keyof typeof schemas].parse(values);
  const {data,error}=await db.from(resource).update(input).eq('id',id).eq('restaurant_id',restaurantId).select().maybeSingle(); dbError(error);
  if(!data) throw new HttpError(404,'Registro não encontrado.');
  return NextResponse.json(data);
 }catch(error){return failure(error);}
}
export async function DELETE(req:NextRequest,{params}:Params) {
 try {
  checkOrigin(req);
  const {restaurantId,resource}=await params;
  z.string().uuid().parse(restaurantId);
  if(resource==='integrations') {
   const {db}=await tenant(restaurantId,'credentials');
   const {provider}=connectSchema.pick({provider:true}).parse(await readJson(req));
   const {error}=await db.rpc('disconnect_integration',{rid:restaurantId,target_provider:provider}); dbError(error);
  } else {
   if(!editable.includes(resource)) throw new HttpError(404,'Módulo não encontrado.');
   const {db}=await tenant(restaurantId,'catalog');
   const {id}=z.object({id:z.string().uuid()}).strict().parse(await readJson(req));
   const {data,error}=await db.from(resource).delete().eq('id',id).eq('restaurant_id',restaurantId).select('id'); dbError(error);
   if(!data?.length) throw new HttpError(404,'Registro não encontrado.');
  }
  return NextResponse.json({ok:true});
 }catch(error){return failure(error);}
}
