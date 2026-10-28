# Validação automática após a primeira publicação

O login, cadastro, persistência, simulação de publicação e separação entre restaurantes pela interface foram confirmados pelo usuário na aplicação publicada. A verificação seguinte é a segurança em chamadas diretas ao banco.

## Conferência rápida no Supabase publicado

No GitHub, abra `supabase/diagnostics/security-audit.sql`, copie o conteúdo e execute em Supabase → SQL Editor → New query → Run. Este arquivo só consulta metadados. Não modifica tabelas, dados, usuários ou permissões. Todos os itens devem apresentar `OK`. Um resultado diferente precisa de investigação; não faça alterações de permissão por tentativa e erro.

O diagnóstico confere RLS nas 16 tabelas, ausência de privilégios anônimos, restrição do schema privado, funções de acesso e triggers que impedem transferência de tenant. Ele não testa o comportamento completo das políticas.

## Ativar os testes no GitHub

1. Envie os arquivos deste pacote mantendo seus caminhos. Ele inclui `.github/workflows/ci.yml` (pasta oculta), a suíte SQL e configurações de testes. Se o navegador não enviar a pasta oculta, crie o arquivo pelo GitHub em Add file → Create new file usando exatamente o nome `.github/workflows/ci.yml`, e cole o YAML incluído no pacote.
2. Faça o commit na branch `main`.
3. Abra a aba **Actions** do repositório. Se necessário, habilite os workflows.
4. Selecione **Validar WillD Hub**. O workflow roda no commit e também pode ser iniciado com **Run workflow → main → Run workflow**.
5. Aguarde os jobs **app** e **database**. A primeira execução pode demorar por causa do download do navegador e das imagens do Supabase.
6. Se ambos ficarem verdes, baixe os relatórios nos artifacts. Se algum falhar, abra a etapa vermelha e compartilhe a mensagem de erro sem chaves ou senhas.

O workflow tem acesso apenas de leitura ao repositório e não exige secrets do Supabase/Vercel. O banco é criado em Docker no runner temporário do GitHub, usa fixtures próprios e é encerrado no final. Não existe comando `link`, `db push`, URL do banco publicado ou alteração no Supabase de produção.

O job `app` executa testes unitários, tipagem, build e navegador em desktop/celular. O job `database` aplica as migrações em Supabase local e executa pgTAP. Os registros de teste ficam dentro de uma transação revertida; não usam os usuários reais nem dependem de quando expirou o período de teste da WillD.

## Arquivos de teste não são migrações

Não execute `supabase/tests/isolation.test.sql` no projeto publicado. Esse arquivo cria fixtures, simula identidades e modifica dados fictícios dentro de uma transação; é destinado ao banco descartável. Não precisa executar novamente as quatro migrações existentes. Para a conferência no banco publicado, use somente `supabase/diagnostics/security-audit.sql`.

## Pendências de produção

- Confirmar os resultados de ambos os jobs; não considerar a suíte SQL executada antes de o job terminar.
- Revisar o lockfile `package-lock.json` guardado no artifact `validacao-app` e adicioná-lo ao repositório para fixar a instalação das dependências.
- Ensaiar concorrência com sessões PostgreSQL independentes para limites e publicação idempotente.
- Implementar recuperação de senha/convites na aplicação e associação visual de produtos a complementos.
- Integrações oficiais e pagamentos continuam fora desta etapa, sem envio a marketplaces ou cobranças reais.
