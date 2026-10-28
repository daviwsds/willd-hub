export type Role = 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'RESTAURANT_MANAGER' | 'RESTAURANT_EMPLOYEE';
export type Action = 'read' | 'catalog' | 'publish' | 'settings' | 'credentials' | 'members' | 'admin';
const permissions: Record<Role, Action[]> = {
  SUPER_ADMIN: ['read', 'catalog', 'publish', 'settings', 'credentials', 'members', 'admin'],
  RESTAURANT_OWNER: ['read', 'catalog', 'publish', 'settings', 'credentials', 'members'],
  RESTAURANT_MANAGER: ['read', 'catalog', 'publish'],
  RESTAURANT_EMPLOYEE: ['read'],
};
export function can(role: Role, action: Action) { return permissions[role]?.includes(action) ?? false; }
export function authorizedTenant(input: { userId: string; restaurantId: string; restaurantStatus: string; role: Role; membershipUserId?: string; membershipRestaurantId?: string }, action: Action) {
  if (input.role === 'SUPER_ADMIN') return can(input.role, action);
  return input.restaurantStatus === 'active' && input.membershipUserId === input.userId && input.membershipRestaurantId === input.restaurantId && can(input.role, action);
}
