import { z } from 'zod';
const name = z.string().trim().min(2).max(120);
const id = z.string().uuid();
const money = z.number().min(0).max(100000).multipleOf(0.01);
export const restaurantSchema = z.object({ name, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80), email: z.string().email(), phone: z.string().max(30).default(''), address: z.string().max(300).default(''), status: z.enum(['active','suspended']).default('active') }).strict();
export const schemas = {
  products: z.object({ name, description: z.string().max(1000).default(''), price: money, category_id: id.nullable().default(null), active: z.boolean().default(true), emoji: z.string().max(8).default('🍇') }).strict(),
  categories: z.object({ name, description: z.string().max(300).default(''), active: z.boolean().default(true), sort_order: z.number().int().min(0).default(0) }).strict(),
  extras: z.object({ name, price: money, active: z.boolean().default(true) }).strict(),
  hours: z.object({ weekday: z.number().int().min(0).max(6), opens_at: z.string().regex(/^\d{2}:\d{2}$/), closes_at: z.string().regex(/^\d{2}:\d{2}$/), closed: z.boolean() }).strict().refine(v => v.closed || v.opens_at < v.closes_at, { message: 'O fechamento deve ser após a abertura.' }),
};
export const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) }).strict();
export const connectSchema = z.object({ provider: z.enum(['ifood', '99food']), credentials: z.record(z.string(), z.string().max(2000)).optional() }).strict();
export const publishSchema = z.object({ provider: z.enum(['ifood','99food']), request_id: id }).strict();
export const memberSchema = z.object({ user_id: id, role: z.enum(['RESTAURANT_OWNER','RESTAURANT_MANAGER','RESTAURANT_EMPLOYEE']) }).strict();
