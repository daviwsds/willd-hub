# Registro de validação

## Confirmado pelo usuário na aplicação publicada

Em 28/10/2026, o usuário confirmou que a aplicação abriu na Vercel após corrigir a tipagem da navegação, as migrações foram aplicadas no Supabase e os seguintes fluxos funcionaram:

- Login de SUPER_ADMIN e de proprietário de um segundo restaurante.
- Criação de produto e persistência após atualizar a página.
- Conexão de teste, publicação simulada e registro no histórico.
- Proprietário do segundo restaurante sem acesso à WillD, aos seus produtos ou à administração global.

Esses são testes manuais relatados pelo usuário. A separação observada pela interface não substitui a verificação de RLS em chamadas diretas.

## Executado no ambiente de desenvolvimento

| Verificação | Resultado |
| --- | --- |
| Autorização, função de acesso, RBAC, criptografia e conectores | 25 testes passaram |
| Estrutura de migrações, FKs compostas, schema privado e idempotência | 6 testes passaram |
| Sintaxe TypeScript/TSX com parser Babel disponível | 17 arquivos passaram |
| Sintaxe YAML do workflow GitHub Actions | Válida |

Os testes unitários usam `node:test` e não exigem instalar dependências. A execução individual detalhada foi confirmada por `node --experimental-strip-types tests/security.test.mjs` e `node --experimental-strip-types tests/migrations.test.mjs`.

## Preparado nesta etapa, execução remota pendente

- Suíte PostgreSQL/pgTAP ampliada para **50 verificações**, com fixtures próprios, sem dependência da WillD ou da expiração do seed. Cobre RLS, RPCs diretas, perfis, limites, expiração, suspensão, idempotência e credenciais.
- Workflow **Validar WillD Hub**, com jobs `app` e `database`, execução automática em main e execução manual. Usa banco Supabase local descartável no runner do GitHub e não acessa produção.
- Playwright em desktop e celular, com relatório HTML, screenshot e trace em falhas. Em CI, testa o servidor de produção compilado no modo demo.
- Diagnóstico somente de leitura em `supabase/diagnostics/security-audit.sql` para verificar a configuração instalada no projeto publicado.

O ambiente local continua sem acesso ao proxy npm e sem permissão de acesso ao socket Docker. Não foram executados aqui o build, a tipagem completa, o navegador ou a suíte PostgreSQL. Não se deve marcar os 50 testes SQL como aprovados até que o job `database` termine com sucesso.

Para executar a etapa pelo GitHub, consulte [NEXT-STEPS.md](NEXT-STEPS.md). A checagem de configuração SQL também não substitui testes de comportamento. Não houve integração ou cobrança real.
