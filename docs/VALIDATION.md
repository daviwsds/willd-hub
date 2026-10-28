# Registro de validação

Executado no ambiente de entrega:

| Verificação | Resultado |
| --- | --- |
| Autorização, isolamento da função de acesso, RBAC, criptografia autenticada e conectores | 25 testes passaram |
| Estrutura das migrações, FKs compostas, schema privado e idempotência | 6 testes passaram |
| Análise de sintaxe TypeScript/TSX com parser Babel disponível no ambiente | 17 arquivos passaram |

Os testes unitários usam `node:test` e não exigem instalar dependências. Execução individual confirmada com `node --experimental-strip-types tests/security.test.mjs` e `node --experimental-strip-types tests/migrations.test.mjs`. A execução agregada por `npm test` também passou; neste ambiente, o reporter agregado apresentou os dois arquivos de testes em vez de detalhar os casos.

Não executado/concluído:

- `npm install`: o acesso ao registro npm ficou bloqueado pela rede/permissões do ambiente. Não há dependências instaladas nem lockfile gerado.
- `npm run typecheck`: tentativa retornou `tsc: not found`, consequência da ausência das dependências. A análise de sintaxe não substitui tipagem ou build.
- `npm run build`: pendente até a instalação das dependências.
- Testes Playwright desktop/celular: escritos, execução pendente. Não há validação visual em navegador nesta entrega.
- Testes reais PostgreSQL/pgTAP: 26 casos escritos em `supabase/tests/isolation.test.sql`, execução pendente. As verificações estruturais de SQL não comprovam a execução ou eficácia das políticas; a suíte real deve passar antes da produção.
- Deploy Vercel/Supabase e aplicação remota das migrações: não realizados; o projeto está preparado como código-fonte.

As pendências são etapas obrigatórias de homologação. Nenhuma integração ou cobrança real foi realizada.
