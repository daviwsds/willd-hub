# Arquitetura e segurança

## Limites de confiança

O browser escolhe o estabelecimento, mas isso não concede acesso. Cada endpoint autenticado valida a sessão com `supabase.auth.getUser()` e lê o perfil do banco. Uma conta comum precisa de membership para o restaurante solicitado e o restaurante deve estar ativo. Em seguida, o servidor verifica a habilidade correspondente. O cliente Supabase usa o JWT do próprio usuário, portanto o PostgreSQL aplica RLS novamente. Não há bypass com chave de serviço nos endpoints.

| Perfil | Leitura | Catálogo/horários | Publicação | Cadastro/credenciais/equipe | Administração global |
| --- | --- | --- | --- | --- | --- |
| SUPER_ADMIN | Sim | Sim | Sim | Sim | Sim |
| RESTAURANT_OWNER | Seu restaurante ativo | Sim | Sim | Sim; proprietários só pelo SUPER_ADMIN | Não |
| RESTAURANT_MANAGER | Seu restaurante ativo | Sim | Sim | Não | Não |
| RESTAURANT_EMPLOYEE | Seu restaurante ativo | Não | Não | Não | Não |

A elevação a SUPER_ADMIN é operação exclusiva do operador do banco. Metadados de cadastro não são fonte de privilégio. Os vínculos são modificados via `manage_member`, que impede proprietários de promover/alterar outros proprietários.

## Banco

`restaurants` tem UUID imutável e cadastro. Entidades filhas usam `restaurant_id NOT NULL`, índices e FK. A identidade global `profiles` está ligada a `auth.users`; uma pessoa pode ter vários vínculos. Planos são recursos globais, assinaturas e pagamentos são por restaurante. Auditoria/erros aceitam tenant nulo apenas para eventos da plataforma.

RLS restringe SELECT/INSERT/UPDATE/DELETE. UPDATE verifica a situação anterior e posterior; triggers proíbem transferir registros de tenant. FKs compostas em produtos/categorias e produtos/complementos impedem relacionamentos cruzados mesmo quando o usuário tem acesso aos dois restaurantes.

Funções `SECURITY DEFINER` têm `search_path` vazio, referências qualificadas e verificam `auth.uid()`/permissões internamente. EXECUTE é revogado de PUBLIC e anon. Triggers internos não podem ser executados como RPC por usuários comuns. O schema `private` não integra os schemas expostos pelo PostgREST, não tem grants de acesso para authenticated/anon e tem RLS sem políticas públicas.

## Publicações e limites

`publish_menu` verifica permissão, assinatura vigente, conexão e limite mensal. A transação bloqueia a linha do restaurante antes de contar/gravar, isolando concorrência. Cada publicação captura produtos ativos e tem `request_id` único por restaurante. Repetições da mesma chave retornam o registro existente. `enforce_product_limit` e `connect_integration` aplicam limites no banco, inclusive em chamadas diretas ao PostgREST.

O snapshot é do catálogo de produtos desta versão, não é evidência de envio a um marketplace. Os conectores independentes validam o cardápio e expõem `realApi=false`.

## Credenciais e sessões

Credenciais opcionais são cifradas por AES-256-GCM, IV aleatório de 12 bytes, tag de autenticação e AAD `restaurant_id:provider`. Reutilizar ciphertext em outro restaurante ou provedor falha na autenticação. O segredo de 32 bytes reside apenas na variável do servidor. Não há endpoints que retornem plaintext ou ciphertext ao usuário. A simulação não precisa de credenciais reais.

Supabase SSR administra cookies; operações de API podem renovar a sessão e a validação de identidade ocorre a cada request. A proteção não depende de esconder links na interface. Mutações exigem Origin igual ao origin da aplicação, JSON válido e corpo de no máximo 32 KiB, medido inclusive para transferências sem Content-Length. Zod recusa propriedades extras, como `restaurant_id` injetado no corpo. Os IDs derivados da URL são sempre revalidados contra o vínculo.

Headers de segurança incluem CSP, `nosniff`, bloqueio de frames e política de referer. A CSP permite scripts inline necessários ao Next.js; para uma política mais rígida, acrescentar nonce por request e validá-la com a versão instalada antes da produção.

## Demonstração

O modo demo é um sandbox local de interface, não um mecanismo de autenticação. Não usa APIs de produção e não recebe segredos. Possui um administrador fictício; qualquer visitante desse modo pode explorar o painel administrativo fictício. Os dados locais têm separação por `restaurant_id` apenas para coerência da demonstração; a segurança real é aplicada pelo servidor/banco no modo conectado. Nunca salvar dados reais nesse modo.
