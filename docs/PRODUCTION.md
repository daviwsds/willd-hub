# Implantação na Vercel com Supabase

## 1. Validar o código

1. Em uma máquina com acesso à rede, execute `npm install` e versione o `package-lock.json` gerado. A instalação não foi possível no ambiente de entrega; o lockfile ainda não existe.
2. Execute `npm test`, `npm run typecheck` e `npm run build`. Corrija qualquer falha antes da implantação.
3. Instale o navegador com `npx playwright install chromium` e execute `npm run test:e2e`.
4. Com Supabase CLI e Docker, execute `supabase start`, `supabase db reset`, `supabase test db`. A suíte pgTAP deve passar antes de qualquer dado real.

## 2. Criar e migrar o banco

Crie um projeto Supabase. Guarde a senha do banco em um gerenciador de segredos. Configure região e backups conforme os requisitos do negócio.

```sh
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

As quatro migrações criam o schema e semeiam os planos e a WillD Açaíteria. Elas devem ser executadas em ordem. O seed é uma migração única, não um processo de reexecução a cada deploy. Não rode `supabase db reset --linked` no projeto de produção.

IDs de demonstração do banco:

- Restaurante WillD: `20000000-0000-4000-8000-000000000001`.
- Plano Profissional: `10000000-0000-4000-8000-000000000002`.

O teste do banco começa no instante da aplicação da migração e dura 14 dias. Nenhum usuário ou senha é criado pelas migrações. Os endereços `.example` e telefone do seed são ilustrativos: substitua-os antes de usar o estabelecimento real.

## 3. Autenticação e primeiro acesso

Desative cadastro público em Supabase Auth. Configure SMTP, URLs de redirecionamento e políticas de senha; mantenha os limites de tentativas de autenticação do Supabase. Crie ou convide as contas do administrador e proprietário pelo painel Auth. Defina suas senhas por um procedimento seguro de convite/recuperação. Copie os UUIDs reais.

Execute o seguinte **apenas no SQL Editor autenticado como operador do banco**, substituindo os UUIDs. O navegador não recebe este privilégio:

```sql
-- O trigger de criação em auth.users já gera profiles com platform_role = USER.
update public.profiles
set platform_role = 'SUPER_ADMIN', name = 'Administrador WillD'
where id = 'UUID_REAL_DO_ADMIN';

insert into public.memberships (restaurant_id, user_id, role)
values (
  '20000000-0000-4000-8000-000000000001',
  'UUID_REAL_DO_PROPRIETARIO',
  'RESTAURANT_OWNER'
);
```

Os marcadores `UUID_REAL_...` devem ser substituídos antes da execução. Confirme o resultado da alteração. Não promova contas com base em metadados do navegador. Os operadores globais são administrados pelo operador do banco, não por um formulário de autopromoção.

Para novas contas de restaurante: o SUPER_ADMIN cria o estabelecimento e sua assinatura no painel; convida a conta pelo Supabase Auth; abre as configurações do restaurante e vincula o UUID como proprietário. Proprietários podem vincular gerentes/funcionários existentes, sem promover ou alterar proprietários.

## 4. Implantar na Vercel

1. Crie um repositório Git com o conteúdo desta pasta e importe-o na Vercel.
2. Framework: Next.js. Se o repositório contiver esta pasta como subdiretório, configure a Root Directory como `willd-hub`.
3. Node.js 24; Build Command: `npm run build`; Output Directory: padrão do Next.js.
4. Configure as variáveis separadamente em Preview e Production:

| Variável | Destino |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do projeto |
| `INTEGRATION_ENCRYPTION_KEY` | Segredo Base64 de 32 bytes, apenas servidor |
| `NEXT_PUBLIC_DEMO_MODE` | `false` para operação real |

5. Para uma prévia pública com dados fictícios, use um deployment separado com `NEXT_PUBLIC_DEMO_MODE=true`, sem credenciais reais.
6. Configure Site URL/redirects no Supabase para a URL definitiva. Ative HTTPS e domínio.
7. Faça login com admin e proprietário. Verifique acesso a todos os módulos e tente acessar o UUID de outro estabelecimento. Verifique também acesso direto à API/PostgREST: a interface sozinha não comprova o isolamento.

Não há necessidade de `vercel.json`: o framework usa o runtime Node.js para rotas e criptografia. Evite o Edge Runtime nestes endpoints. Não configure cache compartilhado para respostas autenticadas.

## 5. Antes de liberar para clientes reais

- Concluir build, tipagem, testes e testes SQL. Revisar logs do deploy e variáveis.
- Configurar SMTP, recuperação de senha, convite e revogação de usuários. Recuperação/convite são operados no Supabase nesta versão; telas dedicadas estão pendentes.
- Configurar MFA para administradores, política de senhas e rate limiting distribuído no WAF da Vercel, especialmente login/publicação. Não há contador em memória tratado como proteção de produção.
- Preparar monitoramento, alertas e rotina de backup/restauração. `error_logs` registra recusas de publicação de modo sanitizado; falhas gerais de infraestrutura dependem dos logs Vercel/Supabase e monitoramento externo.
- Definir retenção/expurgo de auditoria, política de privacidade, termos e tratamento de dados pessoais.
- Substituir dados ilustrativos da WillD e revisar limites/valores dos planos com o negócio.
- Implementar paginação/consultas agregadas: listas administrativas carregam até 500 registros; histórico e auditoria do restaurante, até 200. Os indicadores usam os registros carregados. Não servem como contagem global em grandes bases.
- Acrescentar testes de concorrência com sessões PostgreSQL independentes para limites e idempotência. Os locks transacionais já estão implementados, mas concorrência real ainda precisa ser ensaiada.
- Implementar associação visual produto/complemento, grupos e regras de quantidade, fotos/upload com políticas de Storage e horários com múltiplos intervalos/períodos noturnos, conforme a necessidade do produto.

## 6. Integrações reais — etapa futura

Os conectores desta versão não chamam APIs externas. O banco aceita somente `mode=simulated`; `status=simulated` não significa conta homologada/conectada em produção. As publicações armazenam um snapshot dos produtos ativos; a transmissão de complementos, categorias e horários depende do mapeamento oficial futuro.

Para cada plataforma, obter autorização comercial/técnica e documentação oficial; confirmar os escopos e operações realmente disponíveis; implementar OAuth ou fluxo de credenciais oficial, renovação, revogação e identificação do merchant por restaurante. Não usar captura de senha de usuários das plataformas. As credenciais opcionais aceitas pelo endpoint são criptografadas no servidor e guardadas no schema `private`; a interface de simulação não pede credenciais reais. Não há endpoint de leitura ou descriptografia no navegador.

Ao habilitar um conector real, preparar migração de estados, fila de jobs/retries, validação de assinatura de webhooks, sincronização, tratamento de limites, teste em sandbox oficial e métricas. O método de descriptografia já exige o contexto correto de restaurante/provedor; falta a rotina privilegiada de leitura para workers reais. Rotação de chave exige descriptografar com a chave antiga e recriptografar os registros com a nova em processo privado controlado; não basta substituir a variável.

## 7. Pagamentos — etapa futura

Escolher gateway e implementar checkout, assinatura, cancelamento e webhooks com assinatura verificada e idempotência. Nunca confiar no status de pagamento enviado pelo cliente. Nesta versão, SUPER_ADMIN pode atualizar status de assinatura e plano manualmente, sem movimentar dinheiro. A tabela `payments` está preparada, mas não há gateway ou cobranças.
