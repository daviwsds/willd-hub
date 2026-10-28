import { NextResponse } from 'next/server';
import { failure, session, dbError } from '@/lib/server/access';
export const dynamic = 'force-dynamic';
export async function GET() {
 try {
  const {db,user,profile} = await session();
  const [{data:restaurants,error},{data:memberships,error:memberError},{data:plans,error:planError}] = await Promise.all([
   db.from('restaurants').select('*').order('created_at'),
   db.from('memberships').select('*').eq('user_id',user.id),
   db.from('plans').select('*').order('monthly_price'),
  ]);
  dbError(error); dbError(memberError); dbError(planError);
  return NextResponse.json({user:{id:user.id,email:user.email,name:profile.name,platform_role:profile.platform_role},restaurants,memberships,plans}, {headers:{'Cache-Control':'no-store'}});
 } catch(error) {return failure(error);}
}
