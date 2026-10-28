export interface MenuConnector {
  provider: 'ifood' | '99food';
  capabilities: { menuPublication: boolean; realApi: boolean };
  validateMenu(products: { name: string; price: number }[]): { valid: boolean; errors: string[] };
}
const simulated = (provider: MenuConnector['provider']): MenuConnector => ({
  provider, capabilities: { menuPublication: true, realApi: false },
  validateMenu(products) {
    const errors = products.length === 0 ? ['Cadastre ao menos um produto ativo.'] : products.flatMap(p => !p.name.trim() || !Number.isFinite(p.price) || p.price < 0 || p.price > 100000 ? ['Produto inválido.'] : []);
    return { valid: errors.length === 0, errors };
  },
});
export const connectors = { ifood: simulated('ifood'), '99food': simulated('99food') };
