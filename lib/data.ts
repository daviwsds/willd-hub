import type { Role } from './permissions';
export type Restaurant = { id:string;name:string;slug:string;email:string;phone:string;address:string;status:'active'|'suspended' };
export type Product = { id:string;restaurant_id:string;name:string;description:string;price:number;emoji:string;active:boolean;category_id:string|null };
export type Category = { id:string;restaurant_id:string;name:string;description:string;sort_order:number;active:boolean };
export type Extra = { id:string;restaurant_id:string;name:string;price:number;active:boolean };
export type Hour = {id:string;restaurant_id:string;weekday:number;opens_at:string;closes_at:string;closed:boolean};
export type Integration = {id:string;restaurant_id:string;provider:'ifood'|'99food';status:'simulated'|'disconnected'|'error';mode:string};
export type Publication = {id:string;restaurant_id:string;provider:string;status:string;product_count:number;created_at:string;request_id:string};
export type Audit = {id:string;restaurant_id:string;action:string;entity:string;created_at:string};
export type Subscription = {id:string;restaurant_id:string;plan_id:string;status:string;trial_ends_at:string|null;current_period_end:string};
export type Payment = {id:string;restaurant_id:string;amount:number;status:string;created_at:string};
export type Member = {id:string;restaurant_id:string;user_id:string;role:Role};
export type Plan = {id:string;name:string;monthly_price:number;product_limit:number;publication_limit:number;integration_limit:number;trial_days:number;features:string[]};
export type Profile = {id:string;name:string;platform_role:string};
export type ErrorLog = {id:string;restaurant_id:string;source:string;message:string;created_at:string};
export type Context = { user:{id:string;name:string;email:string;platform_role:string};restaurants:Restaurant[];memberships:Member[];plans:Plan[] };
export type Snapshot = {products:Product[];categories:Category[];extras:Extra[];hours:Hour[];integrations:Integration[];publications:Publication[];audit_logs:Audit[];subscriptions:Subscription[];payments:Payment[];memberships:Member[]};
export type AdminData = {restaurants:Restaurant[];profiles:Profile[];memberships:Member[];plans:Plan[];subscriptions:Subscription[];integrations:Integration[];publications:Publication[];error_logs:ErrorLog[];audit_logs:Audit[]};
export const emptySnapshot:Snapshot={products:[],categories:[],extras:[],hours:[],integrations:[],publications:[],audit_logs:[],subscriptions:[],payments:[],memberships:[]};
export const emptyAdmin:AdminData={restaurants:[],profiles:[],memberships:[],plans:[],subscriptions:[],integrations:[],publications:[],error_logs:[],audit_logs:[]};
export const rid='20000000-0000-4000-8000-000000000001';
const cid=(n:number)=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const demoPlans:Plan[]=[
 {id:'10000000-0000-4000-8000-000000000001',name:'Essencial',monthly_price:49.90,product_limit:50,publication_limit:30,integration_limit:1,trial_days:14,features:['50 produtos','1 integração','30 publicações por mês']},
 {id:'10000000-0000-4000-8000-000000000002',name:'Profissional',monthly_price:99.90,product_limit:300,publication_limit:150,integration_limit:2,trial_days:14,features:['300 produtos','2 integrações','150 publicações por mês']},
 {id:'10000000-0000-4000-8000-000000000003',name:'Escala',monthly_price:199.90,product_limit:1500,publication_limit:500,integration_limit:2,trial_days:14,features:['1.500 produtos','2 integrações','500 publicações por mês']},
];
export const demoContext:Context={
 user:{id:'40000000-0000-4000-8000-000000000001',name:'Equipe WillD',email:'demo@willd.example',platform_role:'SUPER_ADMIN'},
 restaurants:[{id:rid,name:'WillD Açaíteria',slug:'willd-acaiteria',email:'contato@willd.example',phone:'(11) 99999-0000',address:'São Paulo, SP',status:'active'}],
 memberships:[{id:cid(9),restaurant_id:rid,user_id:'40000000-0000-4000-8000-000000000001',role:'RESTAURANT_OWNER'}],plans:demoPlans,
};
export function makeDemo():Snapshot {
 const since=(days:number)=>new Date(Date.now()-days*86400000).toISOString();
 return {
  categories:[{id:cid(1),restaurant_id:rid,name:'Açaís',description:'Seu açaí do seu jeito',active:true,sort_order:1},{id:cid(2),restaurant_id:rid,name:'Combos',description:'Para compartilhar',active:true,sort_order:2},{id:cid(3),restaurant_id:rid,name:'Bebidas',description:'Para refrescar',active:true,sort_order:3}],
  products:[['Açaí tradicional 300ml','Açaí cremoso, banana e granola.',16.9,'🍇',1],['Açaí especial 500ml','Morango, leite em pó e leite condensado.',24.9,'🍓',1],['Açaí premium 700ml','Creme de avelã, frutas e muito açaí.',32.9,'🍫',1],['Combo do casal','Dois açaís de 500ml com complementos.',44.9,'💜',2],['Combo da galera','Quatro açaís tradicionais de 300ml.',59.9,'🍇',2],['Suco de laranja 400ml','Natural, feito na hora.',9.9,'🍊',3]].map((p,i)=>({id:cid(10+i),restaurant_id:rid,name:String(p[0]),description:String(p[1]),price:Number(p[2]),emoji:String(p[3]),category_id:cid(Number(p[4])),active:true})),
  extras:['Leite em pó','Creme de avelã','Morango','Granola'].map((name,i)=>({id:cid(20+i),restaurant_id:rid,name,price:[3,5,4,2][i],active:true})),
  hours:Array.from({length:7},(_,weekday)=>({id:cid(30+weekday),restaurant_id:rid,weekday,opens_at:'12:00',closes_at:'23:00',closed:false})),
  integrations:[{id:cid(40),restaurant_id:rid,provider:'ifood',status:'simulated',mode:'simulated'},{id:cid(41),restaurant_id:rid,provider:'99food',status:'disconnected',mode:'simulated'}],
  publications:[6,5,3,1].map((day,i)=>({id:cid(50+i),restaurant_id:rid,provider:'ifood',status:'simulated',product_count:6,created_at:since(day),request_id:cid(70+i)})),
  subscriptions:[{id:cid(80),restaurant_id:rid,plan_id:demoPlans[1].id,status:'trialing',trial_ends_at:new Date(Date.now()+14*86400000).toISOString(),current_period_end:new Date(Date.now()+14*86400000).toISOString()}],
  audit_logs:[],payments:[],memberships:demoContext.memberships,
 };
}
export const weekdays=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
export const money=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export const date=(value:string)=>new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
