# Plano de lançamento da KIZI

**Objetivo:** deixar a KIZI pronta para receber lojistas de verdade e validar o produto antes de investir em anúncios. Este plano considera o estado atual do repositório; não é uma lista para reconstruir funcionalidades que já existem.

## O que já existe e não deve ser refeito como etapa de lançamento

O código e o produto já incluem:

- cadastro de loja com Google e encaminhamento para o painel;
- painel administrativo para gerenciar loja, produtos, clientes e pedidos;
- vitrine pública para cada loja;
- retirada e entrega configuráveis por distância, com faixas de quilômetros e preço, prazo e regra de frete grátis;
- checkout Mercado Pago para lojas conectadas, além do fluxo de pedido por WhatsApp quando a loja não habilita pagamento online;
- botão de suporte por WhatsApp no admin e oferta de ajuda para criar a loja no portal;
- exclusão lógica de produtos, mantendo o histórico de pedidos.

Esses itens precisam passar pelos testes de lançamento abaixo, mas não devem ser tratados como funcionalidades a começar do zero.

## Modelo de planos acordado

- **Grátis, sem expiração:** pode cadastrar produtos sem limite, mas publicar até 10 por vez. Produtos pausados continuam salvos no admin e não são confundidos com produtos excluídos pelo lojista.
- **Imagens:** até 5 imagens por produto em ambos os planos.
- **Grátis:** pedidos pelo WhatsApp e somente retirada.
- **Completo:** libera todos os recursos já disponíveis na KIZI; preço anunciado atualmente: R$ 49,90/mês.
- **Downgrade para Grátis:** pausa todos os produtos publicados; o lojista escolhe manualmente quais até 10 republicar. Os dados, imagens e configurações são preservados.

Publicação é uma escolha explícita, separada da exclusão lógica. Produtos novos são publicados por padrão quando há capacidade; no Grátis, um produto novo criado após o limite fica pausado. Mudar para Completo não republica automaticamente itens pausados.

## Sequência de trabalho

### 1. Fechar a promessa do lançamento

Antes de mexer em mais funcionalidades, definir e escrever em linguagem simples:

- Para quem a KIZI é primeiro: por exemplo, pequenos lojistas que precisam de uma vitrine simples e de ajuda humana.
- O que a loja consegue configurar hoje: retirada, entrega com preço definido pela loja por distância e pagamento pelo WhatsApp ou Mercado Pago conectado.
- Como apresentar as faixas de distância: são regras de entrega e preço configuradas pelo lojista; não são cotação de transportadora nem compra automática de etiqueta.
- Se o lançamento aceita atendimento além da área local usando faixas de quilômetros. Se sim, tratar como preço de entrega definido pelo lojista e testar endereços reais; não anunciar como integração nacional com transportadoras.
- O que está incluído em cada plano, qual é o preço, como cancelar e quais custos de pagamento podem ser cobrados pelos provedores.

**Pronto quando:** o portal, o onboarding e a equipe descrevem a mesma oferta, sem prometer recursos ainda não disponíveis.

### 2. Conectar a cobrança recorrente antes de vender o plano pago

O admin já aplica o limite de 10 produtos publicados no Grátis, pausa os produtos no downgrade e bloqueia recursos de pagamento online e entrega local no Grátis. A cobrança recorrente do plano Completo usa a API de Assinaturas do Mercado Pago (`preapproval`), separada do Checkout Pro usado pelas vendas das lojas. A ativação depende de webhook autenticado; cancelamento e falha mantêm o acesso até o fim do período pago. A migração da cobrança rebaixa ao Grátis e pausa os produtos de planos Completo que haviam sido ativados manualmente, pois não há assinatura recorrente que comprove esses acessos. A integração de subcontas Asaas encontrada é para receber pagamentos das lojas; isso não equivale à cobrança da assinatura da KIZI.

Antes de anunciar ou cobrar o plano pago em produção:

- escolher o provedor de recorrência da KIZI e confirmar o fluxo de autorização de cartão hospedado pelo provedor, evitando que a KIZI armazene dados de cartão;
- configurar as credenciais da conta da KIZI para a API de Assinaturas (`MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN`) e o segredo de webhook da aplicação de Assinaturas (`MERCADOPAGO_SUBSCRIPTION_WEBHOOK_SECRET`), além da URL HTTPS pública;
- validar no ambiente de produção ativações, renovações, falhas de cobrança e cancelamentos com webhooks do provedor;
- definir a política de atraso/falha de cobrança e comunicar a data efetiva do downgrade;
- mostrar preço, renovação, limites, cancelamento e taxas de terceiros sem ambiguidades.

**Pronto quando:** o provedor e o servidor mantêm a assinatura sincronizada em produção, e o lojista consegue entender, pagar e cancelar sem depender de uma conversa informal. A troca manual disponível agora é para teste local, não substitui a cobrança de produção.

### 3. Fechar confiança, políticas e suporte humano

- Publicar termos de uso da KIZI e política de privacidade/LGPD, revisados por profissional adequado; explicar papéis e responsabilidades da KIZI e do lojista.
- Definir quais informações e políticas cada lojista precisa apresentar na própria loja — contato, entrega, pagamento, trocas e devoluções — e orientar o lojista a preenchê-las.
- Definir horário e prazo de resposta do suporte gratuito e publicar somente um compromisso que possa ser cumprido.
- Preparar o WhatsApp de atendimento: responsável por responder, mensagens iniciais, processo de criação assistida da loja e alternativa para quando o canal estiver indisponível. Se o número atual for pessoal, decidir se ele pode ser divulgado em anúncios.
- Definir como o lojista recupera acesso. Se Google for o único método, explicar o que fazer quando perder acesso à conta; se houver login por senha, garantir recuperação segura.

**Pronto quando:** cliente e lojista encontram quem é responsável, como pedir ajuda e quais são as regras, antes de fornecer dados ou fazer uma compra.

### 4. Preparar uma operação de produção — separada da configuração local

O Compose e os endereços `localhost` do projeto são voltados ao ambiente local. Antes de receber tráfego real, preparar e testar uma configuração de produção própria:

- domínios finais, HTTPS, DNS e roteamento de cada loja; URLs públicas corretas para portal, admin, API e callbacks do Mercado Pago;
- credenciais e chaves de produção em armazenamento seguro, sem valores de desenvolvimento nem segredos no repositório;
- banco de produção com acesso restrito, backups automáticos e um teste real de restauração;
- armazenamento persistente para imagens, substituindo qualquer modo mock/local usado no desenvolvimento; como o Grátis não limita o total de produtos, redimensionar/comprimir todos os caminhos de upload, impor limite razoável de bytes por arquivo e acompanhar uso/custo do S3;
- confirmar se o versionamento do bucket S3 está habilitado e configurar regra de expiração de versões antigas se estiver; os banners atuais são enviados sempre para a mesma chave por loja/tipo e um novo upload substitui o objeto corrente;
- endpoint estável para webhooks, validação de assinatura, logs de falha e comportamento seguro em notificações repetidas;
- CORS, cookies/tokens, limites de upload, permissões e isolamento entre lojas revisados para os domínios reais;
- monitoramento de disponibilidade, erros da API, falhas de pagamento e espaço/capacidade, com uma pessoa responsável por agir;
- procedimento para deploy, migrações, rollback e resposta a incidente.

Não usar um túnel temporário como URL de callback de produção. Não considerar o stack pronto só porque os containers sobem localmente.

**Pronto quando:** um deploy limpo em produção funciona com domínio e HTTPS reais, os callbacks chegam, imagens permanecem disponíveis e um backup pode ser restaurado.

### 5. Fazer uma rodada de usabilidade e revisão visual

Testar com lojistas que não participaram do desenvolvimento, preferencialmente pelo celular:

1. criar a conta e a loja;
2. entender o que fazer primeiro no painel;
3. cadastrar e publicar um produto com foto e estoque;
4. configurar WhatsApp, retirada ou faixas de entrega;
5. conectar Mercado Pago se quiser receber online;
6. abrir a vitrine como cliente, encontrar o produto e concluir um pedido;
7. localizar o pedido no painel e avançar seu status;
8. pedir ajuda pelo WhatsApp.

Registrar onde a pessoa hesita, que termos não entende e em que momento pede ajuda. Corrigir primeiro os bloqueios e textos confusos; evitar adicionar opções avançadas ao fluxo inicial. Se o lojista precisar de ajuda para montar a loja, isso pode ser um serviço acolhedor da KIZI — não deve ser requisito para conseguir usá-la.

**Pronto quando:** pelo menos cinco lojistas-alvo conseguem completar o percurso principal, e cada problema que impede cadastro, publicação ou pedido foi corrigido ou tem solução explícita.

### 6. Validar os fluxos críticos de ponta a ponta

Executar uma matriz de testes com lojas e clientes de teste, incluindo navegador de celular:

- cadastro Google, subdomínio disponível/ocupado, falha de rede e retomada após erro;
- criação/edição/arquivamento de produto, imagens, variações e estoque;
- limite de 5 imagens por produto aplicado no servidor em todos os caminhos de criação e edição; downgrade não remove imagens;
- no Grátis, publicar até 10 produtos; criar um 11º deve deixá-lo pausado, e produtos pausados não aparecem na vitrine;
- mudar de Completo para Grátis deve pausar todos os produtos publicados sem apagar imagens ou histórico; depois, republicar manualmente até 10;
- alternar entre os planos no painel e confirmar os recursos de cada plano; essa ação manual é apenas para testes até integrar cobrança;
- loja sem checkout online: pedido abre o WhatsApp correto com itens, valores e método de entrega compreensíveis;
- loja com Mercado Pago: autorização, compra aprovada, pendente, recusada e cancelada; retorno ao site e atualização do pedido pelo webhook;
- notificações repetidas ou atrasadas não duplicam pedido, não descontam estoque duas vezes e não marcam pagamento errado;
- retirada sem endereço e entrega fora da área são bloqueadas com explicação útil;
- faixas de distância, CEPs próximos dos limites, frete grátis, endereços inválidos e falha dos serviços de consulta de CEP;
- produto arquivado some da vitrine, mas continua legível nos pedidos anteriores;
- dados de uma loja não aparecem no painel, API ou vitrine de outra.

Usar contas e credenciais de teste até os fluxos estarem estáveis; depois confirmar em produção com uma transação pequena e controlada, conforme as condições do provedor.

**Pronto quando:** não há falha crítica ou pedido perdido; preços e status conferem entre cliente, provedor de pagamento e painel; erros comuns explicam como seguir.

### 7. Fazer um piloto acompanhado antes de comprar tráfego

- Convidar de 5 a 10 lojistas do público desejado, sem campanha paga.
- Acompanhar individualmente a primeira configuração e observar onde precisam de ajuda.
- Pedir que façam pelo menos um pedido de teste e, se apropriado, uma venda real de baixo valor.
- Registrar dúvidas recorrentes, tempo até publicar o primeiro produto, lojas que não chegam a publicar, problemas de pagamento/entrega e motivos de desistência.
- Corrigir problemas que afetam vários lojistas antes de ampliar o grupo.

**Gate sugerido para avançar:** pelo menos 4 em cada 5 lojistas do piloto publicam a loja e concluem o percurso de pedido; nenhum pedido ou pagamento fica perdido/inconsistente; não há incidente grave de privacidade ou acesso entre lojas; o suporte consegue cumprir o prazo publicado. Rever a meta se o público ou tamanho do piloto mudar.

### 8. Só então iniciar anúncios pequenos e mensuráveis

- Criar páginas de destino e mensagens voltadas a um público de cada vez, com promessa alinhada à etapa 1.
- Configurar UTMs e métricas para visitas, início/conclusão de cadastro, primeira loja publicada, primeiro produto, primeiro pedido e ativação do plano pago.
- Usar analytics com coleta mínima e consentimento/configuração adequados à política de privacidade e às ferramentas de anúncios.
- Definir um teto de gasto e uma regra para pausar a campanha quando houver erro de cadastro/pagamento, suporte atrasado ou custo de aquisição incompatível com a receita.
- Começar com orçamento pequeno; aumentar apenas quando houver lojas ativadas e evidência de que continuam usando a plataforma — não apenas cliques ou cadastros.
- Revisar semanalmente conversão, ativação, pedidos concluídos, conversas de suporte, cancelamentos e custo por lojista ativo.

**Pronto quando:** cada anúncio pode ser ligado a cadastros e lojas efetivamente ativadas, e existe um limite de perda e uma rotina para agir sobre os dados.

## Deixar para depois do primeiro piloto

Não precisam bloquear o primeiro teste com lojistas, desde que a oferta não prometa esses recursos:

- cotação automática de transportadoras, OAuth de Melhor Envio/Frenet e compra de etiquetas;
- automações avançadas, importação em massa e integrações extensas;
- recursos avançados de relatórios ou personalização.

Priorizar esses itens depois de observar demanda concreta. Para o início, validar muito bem o que já existe — loja, produto, pedido, pagamento, entrega e suporte — tende a reduzir mais desistências do que ampliar o número de integrações.
