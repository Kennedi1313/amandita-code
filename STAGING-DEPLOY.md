# Deploy de staging na VPS

O workflow `.github/workflows/staging.yml` valida backend e frontends em pushes e pull requests. O job de deploy só roda em push quando a variável `STAGING_DEPLOY_ENABLED` estiver como `true`.

O deploy envia o código do commit ao servidor por SSH e executa `docker compose up --build`. Não envia o `.env`, não publica imagens em registry e não executa `docker compose down -v`; o volume do Postgres é preservado.

## 1. Preparar a VPS

- Instale Docker Engine com o plugin Docker Compose v2, `curl` e `tar`.
- Crie um usuário de deploy com chave SSH dedicada e acesso ao Docker.
- Crie um diretório estável para o checkout, por exemplo `/opt/kizi-staging`.
- Configure nesse diretório um `.env` fora do Git. Use `POSTGRES_PASSWORD` forte, com pelo menos 24 caracteres, e `MERCADOPAGO_SANDBOX=true`.
- Configure as URLs públicas HTTPS de staging para API, painel, portal e vitrine; configure também `SAAS_BASE_DOMAIN`, `GOOGLE_CLIENT_ID` e as origens CORS.
- Configure as credenciais de sandbox do Mercado Pago. Mantenha tokens e segredos apenas no `.env` da VPS.
- Instale um proxy HTTPS no host (Caddy/Nginx) e roteie os domínios para os serviços locais: API `127.0.0.1:8080`, admin `127.0.0.1:4173`, vitrine `127.0.0.1:3000`, portal `127.0.0.1:5174`. Configure DNS e certificado TLS, incluindo wildcard para os subdomínios das lojas.

O workflow não configura DNS, TLS ou o proxy reverso, pois esses passos dependem do domínio e do provedor escolhidos.

## 2. Configurar GitHub Actions

Em **Settings → Environments**, crie o ambiente `staging`. Adicione nele estes *secrets*:

- `VPS_HOST`: IP ou hostname da VPS.
- `VPS_USER`: usuário SSH de deploy.
- `VPS_SSH_PRIVATE_KEY`: chave privada dedicada à automação.
- `VPS_KNOWN_HOSTS`: linha de `known_hosts` da VPS, obtida e conferida por um canal confiável.
- `VPS_APP_DIR`: caminho absoluto do diretório, como `/opt/kizi-staging`.
- `VPS_SSH_PORT`: opcional; padrão `22`.

Em **Settings → Secrets and variables → Actions → Variables**, defina `STAGING_DEPLOY_ENABLED=true`.

Adicione a chave pública correspondente a `VPS_SSH_PRIVATE_KEY` em `~/.ssh/authorized_keys` do usuário de deploy. Não use a chave SSH pessoal.

## 3. Acionar

Depois de configurar variáveis e secrets, um push para `mega-pr-mvp-safety-pass` ou `main` roda validações; com o deploy habilitado, também publica em staging. O job exige que os testes e builds passem antes de conectar à VPS. O `workflow_dispatch` permite execução manual depois que o workflow estiver disponível na branch padrão.

O script faz verificações HTTP locais dos quatro serviços depois da subida. A URL pública, certificado, login Google, pagamentos de sandbox e webhooks devem ser conferidos no navegador após o deploy.
