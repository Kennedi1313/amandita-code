# Auditoria de pré-lançamento — KIZI / Amandita

**Execução:** 23/10/2026 (America/Fortaleza)
**Ambiente:** Docker Compose local, aplicações existentes; pedido sandbox `#82` pago e acompanhado no admin e storefront. Nenhuma cobrança Live nem etiqueta/frete real foi comprada.
**Como ler:** `[x]` passou no teste descrito; `[!]` falhou; `[~]` passou parcialmente/com ressalva; `[ ]` não executado. Itens não executados e motivo estão no fim.

## Resultado desta rodada

- **Passou:** `mvn test` (38 testes, 0 falhas); builds do admin, storefront e portal; health da API; bloqueio de endpoints administrativos sem autenticação; rejeição de notificações de pagamento inválidas; smoke tests de navegador nas aplicações; disponibilidade de robots/sitemap; teste responsivo mobile da vitrine e portal; login Google de cliente e navegação autenticada no admin; checkout sandbox confirmado; CRUD de produto no admin; ciclo de status até entregue.
- **Corrigido e validado nesta rodada:** rota inexistente do portal retorna 404; metadados globais não duplicam os da página de produto; os avisos de hooks/imagem foram eliminados; o admin divide as telas por rota e seu maior chunk ficou em ~477 kB, abaixo do limite de aviso do Vite.
- **Google Sign-In local:** autenticação de cliente concluída na vitrine em `http://localhost:3000` pelo Chrome local; o admin autenticado em `http://localhost:4173` também foi exercitado.
- **Checkout sandbox desta rodada:** a preferência abriu o Checkout Pro usando `https://localhost/success?...`; o usuário concluiu a etapa “Pagar agora” no sandbox e a tela de sucesso aguardou a confirmação no banco. A reconciliação do Mercado Pago atualizou o pedido `#82` para Pago, sem confiar no status da URL.
- **Ciclo de pedido:** no admin, `#82` foi atualizado de Pago → Em separação → Enviado (com código externo de teste `QA82LOCAL2026`) → Entregue. A vitrine refletiu Entregue, o frete Melhor Envio, o endereço congelado da compra e o código de acompanhamento. **Status Entregue foi simulado manualmente para QA; não houve despacho ou entrega física.**
- **CRUD de produto:** criado produto temporário com imagem, categoria `teste`, preço/estoque; os defaults da categoria preencheram peso e dimensões. Produto apareceu na vitrine e foi depois excluído pelo próprio admin; lista voltou a 3 produtos. Nenhum produto preexistente foi alterado.
- **Correção encontrada durante QA:** o acompanhamento no histórico da vitrine desaparecia no status Entregue e não exibia código externo inserido no admin. A interface agora mantém o acompanhamento em Enviado e Entregue, mostra código externo e mantém link para códigos Melhor Envio.
- **Feedback de carregamento do checkout:** no primeiro frame, os dados do perfil aparecem vazios e o checkout acusa campos faltantes; após a consulta assíncrona, os dados existentes são carregados, o bloqueio some e as opções de frete aparecem. É um estado visual transitório que precisa de loading/skeleton ou bloqueio da avaliação até o carregamento.
- **URL de retorno local do Mercado Pago:** a preferência recebeu `https://localhost/success?...`, sem porta; o usuário trocou manualmente para `http://localhost:3000/success?...` no navegador local. Esse fluxo foi confirmado no checkout sandbox do pedido `#82`.
- **Carregamento do checkout:** a tela agora sinaliza o carregamento do perfil até terminar a consulta e, após o rebuild, os dados e opções de frete foram exibidos sem o falso estado inicial de campos faltantes.
- **Revisão para staging (26/10/2026):** portal atualizado para Vite 8.3.5, `@vitejs/plugin-react` 6.1.2 e Node 22. `npm audit` passou com 0 vulnerabilidades; `npm run build`, `docker compose config --quiet` e `git diff --check` passaram. A imagem Docker não foi compilada porque o daemon do Docker estava desligado nesta sessão.

## 1. Infraestrutura técnica

- [x] **Containers ativos:** `docker compose ps` mostrou API, banco, admin, storefront e portal em execução.
- [x] **Health da API:** `GET /actuator/health` retornou `200` e `{"status":"UP"}`.
- [x] **Health do banco e smoke HTTP:** `pg_isready` passou dentro do container; admin, storefront e portal responderam no navegador; portal e storefront serviram os recursos estáticos verificados.
- [ ] **Restauração de backup:** não há restauração isolada executada nesta rodada. Não considerar backup validado apenas por existir.
- [ ] **Carga/latência e taxa de erro:** sem teste de carga nesta rodada.
- [ ] **Domínio próprio, DNS e TLS ponta a ponta:** não foi criado nem alterado domínio. Validar instruções, detecção de propagação e certificado em ambiente controlado.
- [ ] **Falha de rede durante upload/cadastro e retry sem duplicação:** não executado.
- [ ] **Teste de recuperação de serviço após indisponibilidade:** não executado.

## 2. Segurança e privacidade

- [x] **Rotas administrativas sem credencial:** `GET /api/v1/store/settings` e `GET /api/v1/customers` retornaram `403` sem autenticação.
- [x] **Assinatura de webhook inválida:** chamada local de teste com assinatura falsa retornou `401`; nenhuma credencial foi impressa.
- [x] **Notificação sem `data.id`:** `POST /api/v1/payment/mercadopago/webhook?store_id=1` com `data` vazio retornou `401`, sem erro 500 de parâmetro obrigatório.
- [x] **Segredo de webhook presente no container:** verificada apenas presença da variável, sem ler nem exibir seu valor.
- [x] **Dependências do portal:** Vite atualizado para 8.3.5 e `@vitejs/plugin-react` para 6.1.2; `npm audit` reportou 0 vulnerabilidades em 26/10/2026.
- [~] **Política de privacidade acessível:** `/privacidade.html` abriu com título, viewport e texto. Isto valida disponibilidade, não conformidade jurídica nem completude dos direitos, finalidades, retenção e papéis de controlador/operador.
- [ ] **Isolamento real entre duas lojas:** testes unitários do interceptor passaram, mas não foi feita tentativa autenticada de IDOR entre duas contas/lojas de QA.
- [ ] **Acesso/exportação/retificação/exclusão e retenção de dados:** não exercitados com titulares e dados de teste.
- [ ] **Revisão de segredos em todos os logs, arquivos publicados, backups e storage:** não foi feita auditoria completa.
- [ ] **CSRF, rate limiting, brute force, gestão de sessão e cabeçalhos em todos os fluxos:** não executados como bateria de segurança.
- [ ] **Exercício de resposta a incidente LGPD:** não executado.

## 3. Mercado Pago

- [x] **Suíte unitária relacionada:** `MercadoPagoCheckoutServiceTest`, `MercadoPagoWebhookServiceTest` e `MercadoPagoSubscriptionServiceTest` passaram dentro da suíte backend.
- [x] **Evento malformado não autenticado:** falta de `data.id` foi rejeitada com `401`.
- [x] **Assinatura inválida não aceita:** assinatura de teste inválida foi rejeitada com `401`.
- [~] **Resposta do endpoint:** os casos negativos responderam corretamente; entrega válida, repetição, atraso e reordenação não foram exercitados de ponta a ponta contra o Mercado Pago.
- [x] **Checkout sandbox comprador → retorno → confirmação no banco:** pedido `#82` pago pelo usuário no Checkout Pro sandbox; a página aguardou a sincronização, e o admin confirmou Pago após consulta/reconciliação. Nenhuma operação Live.
- [ ] **Pix sandbox:** geração, pagamento, expiração e tentativa após expiração não executados de ponta a ponta.
- [ ] **Estorno e chargeback:** não executados.
- [ ] **OAuth do lojista:** autorizar, negar, renovar token, revogar e reconectar não executados com conta de teste.
- [ ] **Assinatura SaaS:** ativação, renovação aprovada/recusada, cancelamento, pausa, reativação e regra de acesso em inadimplência não foram simulados no gateway.
- [~] **Webhook/reconciliação válido com recurso consultado e estado persistido:** pedido sandbox `#82` ficou pago e foi sincronizado no admin; o cenário foi confirmado funcionalmente, mas não auditamos individualmente cada reentrega/reordenação de webhook.
- [ ] **Live:** nenhuma cobrança, estorno ou operação em produção foi disparada.

## 4. Onboarding

- [x] **Smoke visual do portal:** carregou no Chrome, apresentou os caminhos de criação própria e criação assistida, CTA para Google e suporte; sem erro de carregamento da aplicação.
- [x] **Google Sign-In na vitrine:** autenticado pelo Google no Chrome local em `http://localhost:3000`, com consentimento explícito do usuário para este teste.
- [x] **Portal em viewport 390 px:** grid do hero ficou em uma coluna, formulário e texto com 356 px e sem overflow horizontal.
- [~] **Onboarding do portal:** fluxo autenticado de criação de loja não foi repetido; autenticação Google da vitrine foi concluída, mas o portal não foi submetido.
- [ ] **Teste com três pessoas leigas:** não executado.
- [ ] **Time to Value (cadastro → loja acessível → primeiro produto → loja vendável):** não instrumentado/medido com participantes.
- [ ] **Abandono, taxa de ajuda e conversão por etapa:** sem dados de coorte suficientes nesta execução.

## 5. Analytics

- [ ] **Números do lojista contra pedidos e pagamentos:** não conciliados em base de QA.
- [ ] **MRR, lojas pagantes, trial→paid e churn:** não conciliados com assinaturas reais/sandbox.
- [~] **Eventos do portal em GA4 e PostHog:** evento de teste chegou aos dois painéis. Ainda falta validar a recusa de cookies e conferir que os payloads não incluem dados pessoais.

## 6. SEO e velocidade mobile

- [x] **Portal robots/sitemap:** ambos responderam HTTP 200; `robots.txt` aponta para o sitemap do portal.
- [x] **Storefront robots/sitemap:** ambos responderam HTTP 200.
- [x] **Metadados do portal:** título, meta description, canonical e tags Open Graph presentes.
- [x] **Metadados da home da loja:** título e descrição da loja carregaram; links de produto e página pública renderizaram.
- [~] **Metadados de produto:** os metadados padrão da loja agora são omitidos na rota `/details/[id]`; a página de produto mantém título, descrição, canonical e Open Graph específicos. O build passou. A vitrine de QA atual não tem produtos publicados para conferir o HTML final de um produto real.
- [x] **Mobile storefront em 390 px:** `document.documentElement.scrollWidth` igual à largura do viewport; sem overflow horizontal.
- [x] **Mobile portal em 390 px:** sem overflow horizontal; grid e formulário em coluna única.
- [~] **Console frontend/admin:** telas carregaram e login Google da vitrine completou; não foi feita varredura completa de console/erros de rede em todas as rotas.
- [x] **404 customizada do portal:** `/nao-existe-qa` e asset inexistente responderam 404; `/` e `/privacidade.html` responderam 200. Verificado após rebuild dentro do container Docker.
- [x] **404 customizada da vitrine:** rota inexistente respondeu HTTP 404 e exibiu a tela própria da loja, com CTA de retorno; conferida no Chrome e no container.
- [x] **Build admin:** passou; telas são carregadas por rota e o maior chunk caiu de ~850 kB para ~477 kB, sem aviso do limite de 500 kB.
- [x] **Build storefront:** passou sem os avisos anteriores de dependências dos hooks e `<img>`; a foto de perfil usa `next/image`.
- [ ] **Core Web Vitals de campo/Lighthouse mobile e teste em aparelho real:** não medidos.
- [x] **Checkout ponta a ponta sandbox:** cliente autenticado, perfil/endereço carregados, cotações disponíveis, retorno local ajustado pelo usuário, confirmação no banco e pedido visível como Pago no admin e na success page. Sem teste em iOS/Android.
- [x] **Fluxo operacional de pedido:** admin registrou Em separação, Enviado (código externo de QA) e Entregue; vitrine refletiu status, endereço histórico e rastreio após a correção. A etiqueta do Melhor Envio não foi comprada.
- [x] **Produto — cadastrar/exibir/excluir:** produto temporário foi criado e apareceu na categoria pública; exclusão confirmou toast e devolveu a lista ao total anterior de 3.

## Evidências automatizadas executadas

- `backend`: `mvn test` — **38 testes, 0 falhas, 0 erros, 0 ignorados**.
- `backend`: `mvn -Dtest=MercadoPagoCheckoutServiceTest test` — **passou** com 2 testes, 0 falhas/erros, incluindo o retorno local `https://localhost` sem porta.
- `admin`: `npm run build` — **passou**, maior chunk ~477 kB, abaixo do limite de aviso do Vite.
- `frontend`: `npm run build` — **passou**, sem os avisos de hooks/imagem reportados anteriormente.
- `portal`: `npm run build` — **passou**.
- Chrome conectado ao ambiente local: smoke tests da home do portal e vitrine; Google Sign-In de cliente concluído; checkout sandbox pago e retorno/success; histórico e pedido `#82` até Entregue; admin autenticado, dashboard, categorias, recebimentos, frete, detalhe e mudança de status; CRUD de produto temporário e confirmação de remoção; viewport mobile do portal/vitrine.
- HTTP local/Docker: `/actuator/health`, endpoints administrativos sem autenticação, dois casos negativos de webhook, `robots.txt`, `sitemap.xml`; portal `/` e `/privacidade.html` (200), caminho inexistente (404), asset ausente (404) e tentativa de traversal (404).
- Builds locais e em imagem Docker: portal, admin e storefront passaram; maior chunk admin ~477 kB; storefront sem os avisos reportados anteriormente.
- Não há classes `*IntegrationTest`/`*IT` no conjunto de testes encontrado; portanto `mvn test` valida unidades, não uma suíte de integração HTTP.

## Não executado por limites de ambiente/escopo desta rodada

- Transações **Live** ou estornos reais: não foram executados.
- Pagamento recusado, Pix expirado, chargeback e renovação de assinatura no **sandbox**: não executados.
- O estado Entregue do pedido `#82` foi uma simulação administrativa; entrega física, evento de rastreio real e compra de etiqueta no Melhor Envio não foram executados para evitar cobrança/despacho.
- Fluxo OAuth real, renovação e revogação com conta de teste do Mercado Pago.
- Criação de conta Google no portal `localhost:5174` (a autenticação da vitrine foi concluída; portal não foi submetido).
- Testes autenticados de isolamento entre duas lojas: faltam duas identidades/lojas explicitamente reservadas para QA; não reutilizei nem alterei dados de produção/local do lojista.
- Restauração de backup em destino isolado e teste de carga.
- Teste moderado com três pessoas leigas e medição de Time to Value.
- Analytics com tráfego e coortes reais, Core Web Vitals de campo e checkout em aparelho físico.
- Testes de penetração abrangentes (CSRF, rate limiting, brute force, storage e revisão completa de segredos); os testes aqui foram smoke/negativos, não certificação de segurança.
