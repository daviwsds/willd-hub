# WillD Hub

Primeira implementação de uma plataforma SaaS multiempresa para gestão de cardápios e preparação de publicações em delivery. Next.js 16, React 19, TypeScript, Supabase Auth e PostgreSQL com RLS. Identidade visual roxa e branca, interface responsiva em português.

## Executar

Requisitos: Node.js 24, npm e acesso ao registro npm.

```sh
cd /workspace/willd-hub
npm install
cp .env.example .env.local
```

Para explorar sem Supabase, configure `NEXT_PUBLIC_DEMO_MODE=true` em `.env.local` e execute:

```sh
npm run dev
```

Abra http://localhost:3000. No desenvolvimento, o aplicativo também entra em demonstração se o Supabase não estiver configurado. Em produção, a demonstração precisa ser habilitada explicitamente. Configuração incompleta em produção não cria acesso de teste automaticamente.

A demonstração inclui a WillD Açaíteria, seis produtos, três categorias, quatro complementos, horários e publicações ilustrativas. Permite criar/editar/excluir itens, conectar canais simulados, publicar, exportar CSV, gerenciar restaurantes e assinaturas. As alterações da demonstração ficam no `localStorage`, separadas por restaurante, sem autenticação real. Use “Reiniciar demo” para restaurar os dados. **Nunca use a demonstração para dados reais.**

## Modo conectado

Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `INTEGRATION_ENCRYPTION_KEY`; mantenha `NEXT_PUBLIC_DEMO_MODE=false`. A chave de criptografia deve ter 32 bytes em Base64:

```sh
openssl rand -base64 32
```

Não inclua a chave de criptografia ou uma chave `service_role` no navegador. A aplicação usa a sessão do próprio usuário no servidor; nenhuma chave de serviço é necessária para sua operação normal.

O procedimento completo para migrações, cadastro do primeiro administrador/proprietário e Vercel está em [docs/PRODUCTION.md](docs/PRODUCTION.md).

## Funcionalidades

- Painel do restaurante: indicadores, produtos, categorias, complementos/adicionais, horários, integrações, simulação de publicação, histórico e auditoria, cadastro, equipe, plano e pagamentos.
- Administração: estabelecimentos, ativação/suspensão, usuários, vínculos e permissões, edição de planos e assinaturas, utilização, integrações e erros.
- Perfis: `SUPER_ADMIN`, `RESTAURANT_OWNER`, `RESTAURANT_MANAGER`, `RESTAURANT_EMPLOYEE`.
- Isolamento: vínculo validado no servidor; RLS em todas as tabelas; `restaurant_id` obrigatório nas entidades de negócio; FKs compostas e tenant imutável.
- Credenciais: AES-256-GCM com nonce aleatório e contexto autenticado de restaurante/provedor; armazenamento em schema privado sem acesso do navegador.
- Publicação: snapshot transacional de produtos ativos, limites de plano, trava por restaurante e chave de idempotência.
- Conectores iFood e 99Food independentes e **apenas simulados**. Não há garantia de operações nas APIs oficiais, conexão OAuth real nem envio aos marketplaces.
- Estrutura de planos mensais, teste, status de assinatura e histórico de pagamentos. **Nenhuma cobrança real.**

## Verificação

```sh
npm test                 # sem dependências externas: autorização, criptografia, conectores e estrutura SQL
npm run typecheck        # requer npm install
npm run build            # requer npm install
npm run test:e2e         # requer npm install e Chromium do Playwright
supabase start           # requer Supabase CLI e Docker
supabase db reset
npm run test:db          # pgTAP: testes reais de RLS e isolamento
```

Instale o navegador de testes com `npx playwright install chromium`. Os testes de navegador cobrem cadastro de produto, publicação simulada, histórico, persistência e largura em desktop/celular. A suíte SQL roda em transação e desfaz seus fixtures.

**Estado da verificação nesta entrega:** testes unitários e estruturais executados; sintaxe de todos os arquivos TS/TSX verificada. Instalação npm, typecheck, build, navegador e Supabase local não foram concluídos neste ambiente por indisponibilidade de acesso ao registro npm/serviços de banco. Consulte [docs/VALIDATION.md](docs/VALIDATION.md). Não considere a aplicação homologada para produção antes desses passos.

## Estrutura

```text
app/                     Páginas e endpoints Next.js
components/hub.tsx       Interface do restaurante e administração
lib/permissions.ts       Matriz de permissões e validação de vínculo
lib/validation.ts        Schemas de entrada no servidor
lib/server/              Sessão, autorização, criptografia e conectores
lib/supabase/            Cliente Supabase do servidor com cookies
supabase/migrations/     Estrutura, seed da WillD e endurecimento de acesso
supabase/tests/          Testes PostgreSQL de isolamento via pgTAP
tests/                   Testes unitários, estruturais e de navegador
docs/                    Arquitetura, validação e implantação
```

O vínculo produto/complemento está preparado na tabela `product_extras`, com FKs compostas e RLS. O editor visual de vínculos e grupos com seleção mínima/máxima ainda precisa ser implementado; esta versão gerencia o catálogo de adicionais separadamente.
