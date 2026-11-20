import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  enableAnalytics,
  getAnalyticsConsent,
  hasAnalyticsConfigured,
  saveAnalyticsConsent,
  trackAnalytics,
} from "./analytics";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1")
  .replace(/\/+$/, "");
const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "mostradigital.com.br";
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:4173";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SUPPORT_WHATSAPP = "5527995074930";
const getSupportUrl = (message) =>
  `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;

const normalizeSubdomain = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const initialAccount = {
  googleCredential: "",
};

const initialStore = {
  storeName: "",
  subdomain: "",
  whatsapp: "",
};

const friendlyError = (error, fallback) => {
  const message = error?.message || "";

  if (!message || message === "Failed to fetch" || message === "NetworkError when attempting to fetch resource.") {
    return "Não foi possível conectar ao servidor. Verifique se o backend está rodando e tente de novo.";
  }

  if (message.toLowerCase().includes("json")) {
    return fallback;
  }

  return message;
};

const readApiResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const highlights = [
  "Grátis para começar",
  "Sem cartão de crédito",
  "Suporte humano no WhatsApp",
];

const workflow = [
  {
    icon: "store",
    title: "Crie sua loja",
    text: "Escolha um nome e um endereço. A estrutura fica pronta em minutos.",
  },
  {
    icon: "box",
    title: "Cadastre seus produtos",
    text: "Adicione fotos, preços e estoque pelo painel, sem precisar programar.",
  },
  {
    icon: "sparkles",
    title: "Comece a vender",
    text: "Compartilhe sua vitrine e receba pedidos pelo WhatsApp ou online.",
  },
];

const resources = [
  {
    icon: "box",
    eyebrow: "Sua vitrine",
    title: "Produtos fáceis de encontrar",
    text: "Adicione fotos, preços e estoque. Atualize seu catálogo pelo painel sempre que precisar.",
  },
  {
    icon: "message",
    eyebrow: "Atendimento e pagamento",
    title: "Venda pelo WhatsApp ou online",
    text: "Receba pedidos pelo WhatsApp ou habilite pagamentos online no plano Completo.",
  },
  {
    icon: "credit-card",
    eyebrow: "Pedidos em ordem",
    title: "Saiba o que precisa ser feito",
    text: "Acompanhe o que chegou, está em preparo ou já foi enviado, sem se perder nas conversas.",
  },
  {
    icon: "truck",
    eyebrow: "Entrega do seu jeito",
    title: "Retirada ou entrega, você escolhe",
    text: "Ofereça retirada, entrega local ou envio conforme a forma como atende seus clientes.",
  },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "para validar a loja",
    description: "Vitrine simples para começar pelo contato direto.",
    features: [
      "Produtos cadastrados sem limite",
      "Até 10 produtos publicados por vez",
      "Até 5 imagens por produto",
      "Pedidos combinados pelo WhatsApp",
      "Retirada na loja",
    ],
    action: "Começar grátis",
  },
  {
    name: "Completo",
    price: "R$ 49,90",
    period: "por mês",
    description: "Sua loja completa para receber pedidos e vender localmente.",
    features: [
      "Produtos e até 5 imagens por produto",
      "Pagamento online integrado",
      "Entrega local e retirada na loja",
      "Variações de produto completas",
      "Dashboard de vendas e pedidos",
    ],
    action: "Criar loja Pro",
    featured: true,
  },
];

const questions = [
  {
    title: "Preciso saber tecnologia?",
    text: "Não. A ideia é operar sozinho, sem complicar.",
  },
  {
    title: "Posso começar sem pagamento online?",
    text: "Sim. Use WhatsApp no começo e evolua depois.",
  },
  {
    title: "O suporte é IA ou humano?",
    text: "O suporte é humano e gratuito. Está disponível no WhatsApp.",
  },
  {
    title: "Em quanto tempo minha loja fica pronta?",
    text: "Criando por conta própria, você coloca a estrutura da loja no ar em até 5 minutos. Se preferir, nossa equipe cria de graça em até 1 dia útil.",
  },
  {
    title: "Preciso pagar para começar?",
    text: "Não. Você pode começar no plano grátis e só evoluir quando precisar de recursos de pagamento e entrega.",
  },
];

function App() {
  const [step, setStep] = useState("account");
  const [account, setAccount] = useState(initialAccount);
  const [store, setStore] = useState(initialStore);
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [createdStore, setCreatedStore] = useState(null);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [cookiesVisible, setCookiesVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!hasAnalyticsConfigured()) return;

    const consent = getAnalyticsConsent();
    if (consent === "accepted") {
      enableAnalytics();
    } else if (consent !== "rejected") {
      setCookiesVisible(true);
    }
  }, []);

  const updateAnalyticsConsent = (consent) => {
    saveAnalyticsConsent(consent);
    setCookiesVisible(false);
  };

  const normalizedSubdomain = useMemo(
    () => normalizeSubdomain(store.subdomain || store.storeName),
    [store.subdomain, store.storeName],
  );
  const previewDomain = normalizedSubdomain
    ? `${normalizedSubdomain}.${BASE_DOMAIN}`
    : `sualoja.${BASE_DOMAIN}`;

  const updateStore = (event) => {
    const { name, value } = event.target;

    if (name === "subdomain") {
      setSubdomainEdited(true);
      setStore((current) => ({
        ...current,
        subdomain: normalizeSubdomain(value),
      }));
      return;
    }

    setStore((current) => {
      const nextStore = {
        ...current,
        [name]: value,
      };

      if (name === "storeName" && !subdomainEdited) {
        nextStore.subdomain = normalizeSubdomain(value);
      }

      return nextStore;
    });
  };

  const createAccountWithGoogle = useCallback(async (credential) => {
    setAccount((current) => ({
      ...current,
      googleCredential: credential,
    }));
    setStatus({ type: "idle", message: "" });
    trackAnalytics("google_sign_in_completed");
    setStep("store");
  }, []);

  const createStore = async (event) => {
    event.preventDefault();
    if (normalizedSubdomain.length < 3) {
      setStatus({ type: "error", message: "Escolha um endereço de loja com pelo menos 3 caracteres." });
      return;
    }
    setStatus({ type: "loading", message: "Montando sua loja..." });
    setCreatedStore(null);

    try {
      if (!account.googleCredential) {
        throw new Error("Entre com Google para criar sua loja.");
      }

      trackAnalytics("begin_store_creation", { plan: "free" });

      const response = await fetch(`${API_URL}/tenants/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: "",
          email: "",
          password: "",
          googleCredential: account.googleCredential,
          ...store,
          subdomain: normalizedSubdomain,
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Não foi possível criar a loja.");
      }

      window.localStorage.setItem("access_token", data.token);
      setCreatedStore(data);
      trackAnalytics("store_created", { plan: "free" });
      setStep("done");
      setStatus({
        type: "success",
        message: "Loja criada. Você já pode finalizar a configuração no painel.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: friendlyError(error, "Não foi possível criar a loja."),
      });
    }
  };

  const goToAdmin = () => {
    const adminUrl = new URL(createdStore?.adminUrl || ADMIN_URL, window.location.origin);
    adminUrl.searchParams.set("handoff", "1");
    const adminWindow = window.open(adminUrl.toString(), "_blank", "noopener=false");
    if (!adminWindow) {
      setStatus({
        type: "error",
        message: "Permita pop-ups para abrir o painel da loja com segurança.",
      });
      return;
    }

    const targetOrigin = adminUrl.origin;
    let attempts = 0;
    const stopHandoff = () => window.clearInterval(intervalId);
    const handleHandoffAccepted = (event) => {
      if (
        event.origin === targetOrigin &&
        event.data?.type === "MOSTRA_DIGITAL_ADMIN_TOKEN_ACCEPTED"
      ) {
        stopHandoff();
        window.removeEventListener("message", handleHandoffAccepted);
      }
    };

    window.addEventListener("message", handleHandoffAccepted);
    const intervalId = window.setInterval(() => {
      attempts += 1;
      adminWindow.postMessage(
        {
          type: "MOSTRA_DIGITAL_ADMIN_TOKEN",
          token: createdStore.token,
        },
        targetOrigin,
      );
      if (attempts >= 20 || adminWindow.closed) {
        stopHandoff();
        window.removeEventListener("message", handleHandoffAccepted);
      }
    }, 250);
  };

  return (
    <main className="page-shell">
      <header className="site-header">
        <nav className="nav" aria-label="Navegação principal">
          <a className="brand" href="#top" aria-label="KIZI, início">
            <img className="brand-mark" src="/logo.png" alt="" />
            <strong>KIZI</strong>
          </a>
          <div className="nav-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
          </div>
          <button
            className="mobile-nav-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <MenuIcon open={mobileMenuOpen} />
          </button>
          <a
            className="button button-small button-primary nav-cta"
            href="#criar"
            onClick={() => {
              setMobileMenuOpen(false);
              trackAnalytics("signup_cta_clicked", { placement: "nav" });
            }}
          >
            Criar loja grátis <ArrowIcon />
          </a>
        </nav>
        <div className={`mobile-nav ${mobileMenuOpen ? "is-open" : ""}`} id="mobile-navigation">
          <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>Como funciona</a>
          <a href="#recursos" onClick={() => setMobileMenuOpen(false)}>Recursos</a>
          <a href="#planos" onClick={() => setMobileMenuOpen(false)}>Planos</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" />LOJA ONLINE PARA PEQUENOS NEGÓCIOS</p>
            <h1>
              Sua loja online.
              <span>Pronta em até 5 minutos.</span>
            </h1>
            <p className="lead">
              Coloque seus produtos na internet sem contratar alguém ou aprender tecnologia. Comece grátis e venda do seu jeito.
            </p>

            <div className="hero-actions">
              <a
                className="button button-primary button-large"
                href="#criar"
                onClick={() => trackAnalytics("signup_cta_clicked", { placement: "hero" })}
              >
                Criar minha loja grátis <ArrowIcon />
              </a>
              <a className="button button-outline button-large" href="#demo">
                Ver demonstração
              </a>
            </div>

            <ul className="highlight-list" aria-label="Vantagens para começar">
              {highlights.map((item) => (
                <li key={item}><CheckIcon />{item}</li>
              ))}
            </ul>

            <a
              className="hero-assisted-link"
              href={getSupportUrl("Oi! Quero que a KIZI crie minha loja gratuitamente. Entendi que a entrega é em até 1 dia útil.")}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackAnalytics("assisted_setup_whatsapp_clicked", { placement: "hero" })}
            >
              Ou peça para a gente criar de graça em até 1 dia útil <span aria-hidden="true">↗</span>
            </a>
          </div>

          <ProductMockup />
        </div>
        <div className="hero-glow" aria-hidden="true" />
      </section>

      <section className="section signup-section" id="criar">
        <div className="signup-copy">
          <p className="section-kicker">Seu primeiro passo</p>
          <h2>Comece com o que você já tem.</h2>
          <p>
            Crie o acesso com sua conta Google. Depois, escolha o nome da loja e pronto: o painel estará preparado para você cadastrar seus produtos.
          </p>
          <div className="signup-benefits">
            <span><CheckIcon />Sem cartão para criar</span>
            <span><CheckIcon />Você pode editar tudo depois</span>
            <span><CheckIcon />Ajuda humana quando precisar</span>
          </div>
          <div className="assist-card">
            <div className="assist-icon"><ChatIcon /></div>
            <div>
              <strong>Prefere não configurar?</strong>
              <p>A gente cria sua loja de graça e entrega em até 1 dia útil.</p>
              <a
                href={getSupportUrl("Oi! Quero solicitar a criação gratuita da minha loja pela equipe KIZI. Entendi que a entrega é em até 1 dia útil.")}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackAnalytics("assisted_setup_whatsapp_clicked", { placement: "signup_section" })}
              >
                Pedir criação pelo WhatsApp <ArrowIcon />
              </a>
            </div>
          </div>
        </div>

        <section className="signup-card" aria-labelledby="signup-title">
          <div className="signup-kicker">
            <span>Crie sua loja</span>
            <span className="free-pill">R$ 0 para começar</span>
          </div>
          <div className="progress" aria-label={step === "account" ? "Etapa 1 de 2" : "Etapa 2 de 2"}>
            <span className={step === "account" ? "active" : "done"}>1</span>
            <div />
            <span className={step === "store" ? "active" : step === "done" ? "done" : ""}>2</span>
          </div>

          {step === "account" && (
            <div>
              <div className="card-header">
                <span>PASSO 1 DE 2</span>
                <h2 id="signup-title">Entre com Google</h2>
                <p>É rápido e seguro. Em seguida, você escolhe o nome da sua loja.</p>
              </div>
              <GoogleButton onCredential={createAccountWithGoogle} />
              <p className="google-fallback" role="status" aria-live="polite">
                {GOOGLE_CLIENT_ID
                  ? "Usamos seu Google para criar seu acesso ao painel."
                  : "O acesso com Google será habilitado quando estiver configurado para este ambiente."}
              </p>
            </div>
          )}

          {step === "store" && (
            <form onSubmit={createStore}>
              <div className="card-header">
                <span>PASSO 2 DE 2</span>
                <h2 id="signup-title">Dê um nome à sua loja</h2>
                <p>Você pode ajustar os detalhes e cadastrar os produtos depois.</p>
              </div>
              <label>
                Nome da loja
                <input
                  name="storeName"
                  value={store.storeName}
                  onChange={updateStore}
                  placeholder="Maria Modas"
                  required
                />
              </label>
              <label>
                Endereço da loja
                <div className="domain-input">
                  <input
                    name="subdomain"
                    value={store.subdomain}
                    onChange={updateStore}
                    placeholder="maria-modas"
                    required
                  />
                  <span>.{BASE_DOMAIN}</span>
                </div>
              </label>
              <label>
                WhatsApp para contato <span className="optional-label">opcional</span>
                <input
                  name="whatsapp"
                  value={store.whatsapp}
                  onChange={updateStore}
                  placeholder="84999999999"
                />
              </label>
              <div className="domain-preview">
                <span>Sua loja vai ficar em</span>
                <strong>{previewDomain}</strong>
              </div>
              <button className="button button-primary submit-button" type="submit" disabled={status.type === "loading"}>
                {status.type === "loading" ? "Criando sua loja..." : "Criar minha loja grátis"}
                {status.type !== "loading" && <ArrowIcon />}
              </button>
              <button className="text-button" type="button" onClick={() => setStep("account")}>
                Voltar
              </button>
            </form>
          )}

          {step === "done" && createdStore && (
            <div className="done-panel">
              <div className="success-mark"><CheckIcon /></div>
              <div className="card-header">
                <span>PRÓXIMO PASSO</span>
                <h2 id="signup-title">Sua loja está no ar.</h2>
                <p>{createdStore.storeName} já tem um endereço. Entre no painel para adicionar produtos e publicar sua vitrine.</p>
              </div>
              <div className="created-box">
                <span>Endereço público</span>
                <strong>{createdStore.domain}</strong>
              </div>
              <button className="button button-primary submit-button" type="button" onClick={() => {
                trackAnalytics("admin_handoff_clicked");
                goToAdmin();
              }}>
                Abrir meu painel <ArrowIcon />
              </button>
              <a
                className="done-help-link"
                href={getSupportUrl(`Oi! Criei a loja ${createdStore.storeName} e quero ajuda para configurar.`)}
                target="_blank"
                rel="noreferrer"
              >
                Quero ajuda para configurar
              </a>
            </div>
          )}

          {status.message && step !== "done" && (
            <p
              className={`form-status ${status.type}`}
              role={status.type === "error" ? "alert" : "status"}
              aria-live={status.type === "error" ? "assertive" : "polite"}
            >
              {status.message}
            </p>
          )}
        </section>
      </section>

      <section className="section features-section" id="recursos">
        <div className="section-heading">
          <p className="section-kicker">Recursos para vender com autonomia</p>
          <h2>Da vitrine ao pedido, sem complicação.</h2>
          <p>Mostre seus produtos, receba pedidos e organize cada venda no seu ritmo.</p>
        </div>
        <div className="bento-grid">
          {resources.map((item, index) => (
            <article className={`bento-card bento-card-${index + 1}`} key={item.title}>
              <div className="bento-card-top">
                <span className="feature-icon"><FeatureIcon name={item.icon} /></span>
                <span className="feature-index">0{index + 1}</span>
              </div>
              <p className="feature-eyebrow">{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <p className="feature-description">{item.text}</p>
              {index === 0 && (
                <div className="channel-preview" aria-hidden="true">
                  <span>Cadastro</span><span>Variações</span><span>Dimensões</span>
                </div>
              )}
              {index === 1 && (
                <div className="channel-preview" aria-hidden="true">
                  <span>WhatsApp</span><span>Pix</span><span>Cartão</span>
                </div>
              )}
              {index === 2 && (
                <div className="channel-preview" aria-hidden="true">
                  <span>Status</span><span>Etiqueta</span><span>Rastreio</span>
                </div>
              )}
              {index === 3 && (
                <div className="shipping-preview" aria-hidden="true">
                  <span>Retirada</span><span>Entrega local</span><span>Envio</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section plans-section" id="planos">
        <div className="section-heading">
          <p className="section-kicker">Sem surpresa no preço</p>
          <h2>Comece grátis. Cresça quando fizer sentido.</h2>
          <p>Crie sua loja sem pagar. Ative mais recursos quando sua operação precisar.</p>
        </div>
        <div className="plans-grid">
          {plans.map((plan) => (
            <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
              {plan.featured && <span className="plan-badge">Para vender online</span>}
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <p className="plan-description">{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}><CheckIcon />{feature}</li>
                ))}
              </ul>
              <a
                className="button button-primary"
                href="#criar"
                onClick={() => trackAnalytics("signup_cta_clicked", {
                  placement: "pricing",
                  plan: plan.name.toLowerCase(),
                })}
              >
                {plan.action} <ArrowIcon />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="assisted-section">
        <div className="assisted-banner">
          <div className="assisted-banner-icon"><ChatIcon /></div>
          <div>
            <p className="section-kicker">Criação assistida, sem custo</p>
            <h2>Se preferir, a gente monta sua loja para você.</h2>
            <p>Conte o que você vende. Nossa equipe prepara a loja e entrega em até 1 dia útil.</p>
          </div>
          <a
            className="button button-light"
            href={getSupportUrl("Oi! Quero que a KIZI crie minha loja gratuitamente. Entendi que a entrega é em até 1 dia útil.")}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackAnalytics("assisted_setup_whatsapp_clicked", { placement: "assisted_banner" })}
          >
            Pedir ajuda <ArrowIcon />
          </a>
        </div>
      </section>

      <section className="section faq-section" id="duvidas">
        <div className="section-heading">
          <p className="section-kicker">Dúvidas comuns</p>
          <h2>Respostas simples, sem letras miúdas.</h2>
        </div>
        <div className="faq-grid">
          {questions.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-main">
            <div className="footer-brand">
              <a className="brand" href="#top" aria-label="KIZI, voltar ao início">
                <img className="brand-mark" src="/logo.png" alt="" />
                <strong>KIZI</strong>
              </a>
              <p>Um jeito mais simples de levar seu negócio para o digital.</p>
            </div>
            <nav className="footer-links" aria-label="Navegação do rodapé">
              <a href="#como-funciona">Como funciona</a>
              <a href="#recursos">Recursos</a>
              <a href="#planos">Planos</a>
              <a href="/privacidade.html">Privacidade</a>
              {hasAnalyticsConfigured() && (
                <button className="cookie-preferences" type="button" onClick={() => setCookiesVisible(true)}>
                  Preferências de cookies
                </button>
              )}
              <a
                className="button button-primary button-small"
                href="#criar"
                onClick={() => trackAnalytics("signup_cta_clicked", { placement: "footer" })}
              >
                Criar loja grátis <ArrowIcon />
              </a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} KIZI</span>
            <span>Feito para simplificar as vendas de pequenos negócios.</span>
          </div>
        </div>
      </footer>

      {cookiesVisible && (
        <div className="cookie-banner" role="dialog" aria-label="Preferências de cookies">
          <p>
            Usamos cookies essenciais e, se você permitir, métricas do Google Analytics e PostHog para entender o uso do portal. Você pode mudar sua escolha em <a href="/privacidade.html">Privacidade</a>.
          </p>
          <div className="cookie-actions">
            <button className="cookie-reject" type="button" onClick={() => updateAnalyticsConsent("rejected")}>
              Recusar métricas
            </button>
            <button type="button" onClick={() => updateAnalyticsConsent("accepted")}>
              Aceitar métricas
            </button>
          </div>
        </div>
      )}
      <a
        className={`mobile-fixed-cta ${cookiesVisible ? "is-hidden" : ""}`}
        href="#criar"
        onClick={() => trackAnalytics("signup_cta_clicked", { placement: "mobile_fixed" })}
      >
        Criar minha loja grátis <ArrowIcon />
      </a>
    </main>
  );
}

function ProductMockup() {
  const barHeights = [30, 46, 37, 64, 48, 76, 56, 88, 65, 79, 58, 96];

  return (
    <div className="product-visual" id="demo" aria-label="Prévia ilustrativa do painel KIZI">
      <div className="mockup-glow" aria-hidden="true" />
      <div className="mockup-window">
        <div className="browser-bar">
          <div className="browser-dots" aria-hidden="true"><i /><i /><i /></div>
          <span className="browser-address">painel.kizi.com.br</span>
          <span className="preview-status"><i /> Prévia</span>
        </div>
        <div className="mockup-app">
          <aside className="mockup-sidebar" aria-hidden="true">
            <div className="mockup-brand"><img src="/logo.png" alt="" /><strong>KIZI</strong></div>
            <span className="sidebar-label">MENU</span>
            <span className="sidebar-link is-active"><span className="sidebar-glyph">⌂</span>Visão geral</span>
            <span className="sidebar-link"><span className="sidebar-glyph">▧</span>Produtos</span>
            <span className="sidebar-link"><span className="sidebar-glyph">▤</span>Pedidos</span>
            <span className="sidebar-link"><span className="sidebar-glyph">◉</span>Minha loja</span>
            <div className="sidebar-bottom"><span className="avatar">A</span><span>Ana Oliveira<small>Minha loja</small></span></div>
          </aside>
          <div className="mockup-content">
            <div className="mockup-topline">
              <div>
                <span className="mockup-kicker">VISÃO GERAL</span>
                <h2>Bom dia, Ana <span aria-hidden="true">✦</span></h2>
                <p>Acompanhe o que está acontecendo na sua loja.</p>
              </div>
              <span className="store-online"><i /> Loja publicada</span>
            </div>

            <div className="mockup-stats">
              <article><span>Vendas do mês</span><strong>R$ 2.480</strong><small>Resumo de exemplo</small></article>
              <article><span>Pedidos</span><strong>18</strong><small>Em todos os canais</small></article>
              <article><span>Produtos ativos</span><strong>24</strong><small>No seu catálogo</small></article>
            </div>

            <div className="mockup-lower">
              <section className="sales-card">
                <div className="sales-card-heading"><div><span>DESEMPENHO</span><h3>Suas vendas</h3></div><span className="period-select">Este mês⌄</span></div>
                <strong className="sales-total">R$ 2.480,00</strong>
                <div className="sales-chart" aria-hidden="true">
                  {barHeights.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
                </div>
                <div className="chart-labels"><span>01 jun</span><span>15 jun</span><span>30 jun</span></div>
              </section>
              <section className="orders-card">
                <div className="sales-card-heading"><div><span>ACOMPANHAMENTO</span><h3>Pedidos</h3></div><span className="orders-count">3</span></div>
                <div className="order-row"><i className="order-dot dot-green" /><span>#1048<small>Pago</small></span><b>R$ 129</b></div>
                <div className="order-row"><i className="order-dot dot-blue" /><span>#1047<small>Em preparo</small></span><b>R$ 84</b></div>
                <div className="order-row"><i className="order-dot dot-gray" /><span>#1046<small>Aguardando</small></span><b>R$ 56</b></div>
              </section>
            </div>
          </div>
        </div>
      </div>
      <div className="mockup-caption"><span className="caption-check"><CheckIcon /></span><span><strong>Simples de administrar</strong><small>Produtos e pedidos em um só painel</small></span></div>
    </div>
  );
}

function FeatureIcon({ name }) {
  const paths = {
    store: <><path d="M3 10h18" /><path d="M5 10v10h14V10" /><path d="m4 10 1.2-6h13.6L20 10" /><path d="M9 20v-6h6v6" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
    message: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-5.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    "credit-card": <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    truck: <><path d="M3 6h11v12H3z" /><path d="M14 10h4l3 3v5h-7" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></>,
    sparkles: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  };

  return (
    <svg className="feature-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.sparkles}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 10h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-5.5A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  );
}

function MenuIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const GoogleButton = ({ onCredential }) => {
  const buttonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || document.querySelector("#google-identity-script")) {
      setScriptReady(Boolean(window.google));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID || !window.google || !buttonRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response?.credential) {
          onCredential(response.credential);
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      logo_alignment: "left",
      width: buttonRef.current.offsetWidth || 360,
      locale: "pt-BR",
    });
  }, [onCredential, scriptReady]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="google-fallback">
        Google ainda não configurado neste ambiente.
      </p>
    );
  }

  return <div className="google-button" ref={buttonRef} />;
};

export default App;
