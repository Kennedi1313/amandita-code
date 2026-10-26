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
  "Sem custo para criar",
  "Você escolhe como começar",
  "WhatsApp e painel simples",
  "Evolua no seu ritmo",
];

const workflow = [
  {
    title: "Crie a loja",
    text: "Nome, endereço e acesso em poucos campos.",
  },
  {
    title: "Suba produtos",
    text: "Fotos, preço, estoque, categorias e variações.",
  },
  {
    title: "Receba pedidos",
    text: "Comece pelo WhatsApp e ative pagamento online depois.",
  },
];

const resources = [
  {
    title: "Prefere deixar com a gente?",
    text: "Criamos sua loja sem cobrar pela criação e entregamos em até 1 dia útil.",
  },
  {
    title: "Suporte sem robô",
    text: "Quando precisar, nosso suporte humano e gratuito está no WhatsApp.",
  },
  {
    title: "Tudo em um painel",
    text: "Acompanhe produtos, pagamentos, clientes e preparos em um só lugar.",
  },
  {
    title: "Sua loja cresce com você",
    text: "Integração com pix, cartão e envio quando fizer sentido pra você.",
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
      <section className="hero">
        <nav className="nav">
          <a className="brand" href="#top" aria-label="KIZI">
            <img className="brand-mark" src="/logo.png" alt="" />
            <div>
              <strong>KIZI</strong>
            </div>
          </a>
          <div className="nav-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <a href="#criar" onClick={() => trackAnalytics("signup_cta_clicked", { placement: "nav" })}>
              Começar grátis
            </a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Sua loja online, do jeito mais simples</p>
            <h1>
              Sua loja no ar.
              <span> Em até 5 minutos.</span>
            </h1>
            <p className="lead">
              Crie sua loja grátis, sem precisar entender de tecnologia. Quer pular essa etapa? A gente monta tudo para você, também de graça, em até 1 dia útil.
            </p>

            <div className="hero-actions">
              <a
                className="primary-link"
                href="#criar"
                onClick={() => trackAnalytics("signup_cta_clicked", { placement: "hero" })}
              >
                Quero criar minha loja
              </a>
              <a
                className="secondary-link"
                href={getSupportUrl("Oi! Quero que a KIZI crie minha loja gratuitamente. Entendi que a entrega é em até 1 dia útil.")}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackAnalytics("assisted_setup_whatsapp_clicked", { placement: "hero" })}
              >
                Prefiro que vocês criem grátis
              </a>
            </div>
            <p className="hero-promise">Criação gratuita nos dois caminhos · sem compromisso para começar</p>

            <ul className="highlight-list">
              {highlights.map((item) => (
                <li key={item}><span aria-hidden="true">✓</span>{item}</li>
              ))}
            </ul>

          </div>

          <section className="signup-card" id="criar">
            <div className="signup-kicker"><span>Crie em poucos passos</span><span>R$ 0 para começar</span></div>
            <div className="progress">
              <span className={step === "account" ? "active" : "done"}>1</span>
              <div />
              <span className={step === "store" ? "active" : step === "done" ? "done" : ""}>2</span>
            </div>

            {step === "account" && (
              <div>
                <div className="card-header">
                  <span>Opção 1 · faça você mesma</span>
                  <h2>Comece sua loja agora</h2>
                  <p>Entre com Google e escolha o nome e o endereço da sua loja. A estrutura fica pronta em até 5 minutos.</p>
                </div>

                <GoogleButton onCredential={createAccountWithGoogle} />

                <p className="google-fallback" role="status" aria-live="polite">
                  {GOOGLE_CLIENT_ID
                    ? "Usamos seu Google apenas para criar o acesso ao painel."
                    : "O acesso com Google será habilitado quando estiver configurado para este ambiente."}
                </p>
                <div className="assisted-choice">
                  <span>Quer pular a configuração?</span>
                  <p>A gente cria sua loja gratuitamente e entrega em até 1 dia útil.</p>
                  <a
                    href={getSupportUrl("Oi! Quero solicitar a criação gratuita da minha loja pela equipe KIZI. Entendi que a entrega é em até 1 dia útil.")}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackAnalytics("assisted_setup_whatsapp_clicked", { placement: "signup_card" })}
                  >
                    Pedir criação grátis pelo WhatsApp <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            )}

            {step === "store" && (
              <form onSubmit={createStore}>
                <div className="card-header">
                  <span>Quase lá</span>
                  <h2>Dê um nome à sua loja</h2>
                  <p>Você pode ajustar os detalhes e cadastrar seus produtos depois, no painel.</p>
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

                <button type="submit" disabled={status.type === "loading"}>
                  {status.type === "loading" ? "Criando sua loja..." : "Criar minha loja grátis"}
                </button>
                <button className="text-button" type="button" onClick={() => setStep("account")}>
                  Voltar
                </button>
              </form>
            )}

            {step === "done" && createdStore && (
              <div className="done-panel">
                <div className="success-mark">✓</div>
                <div className="card-header">
                  <span>Seu próximo passo</span>
                  <h2>Sua loja está no ar.</h2>
                  <p>{createdStore.storeName} já tem um endereço. Entre no painel para adicionar produtos e publicar sua vitrine.</p>
                </div>
                <div className="created-box">
                  <span>Endereço público</span>
                  <strong>{createdStore.domain}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    trackAnalytics("admin_handoff_clicked");
                    goToAdmin();
                  }}
                >
                  Abrir meu painel
                </button>
                <a className="done-help-link" href={getSupportUrl(`Oi! Criei a loja ${createdStore.storeName} e quero ajuda para configurar.`)} target="_blank" rel="noreferrer">
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
        </div>
      </section>

      <section className="preview-section" aria-label="Prévia do painel KIZI">
        <div className="preview-caption">
          <span>Painel simples de verdade</span>
          <p>Produtos, pedidos e informações da sua loja em um só lugar.</p>
        </div>
        <div className="app-preview">
          <img src="/platform-preview.png" alt="Painel KIZI para administrar produtos e pedidos da loja" />
        </div>
      </section>

      <section className="section workflow-section" id="como-funciona">
        <div className="section-header">
          <span>Você decide o ritmo</span>
          <h2>Do nome da loja à vitrine, sem complicação.</h2>
          <p>Em poucos minutos você cria a estrutura. Depois, completa a vitrine quando quiser.</p>
        </div>

        <div className="workflow-grid">
          {workflow.map((item, index) => (
            <article className="workflow-card" key={item.title}>
              <span>{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section features-section" id="recursos">
        <div className="feature-band">
          <div className="feature-copy">
            <span>Gente de verdade do seu lado</span>
            <h2>Você não precisa fazer tudo sozinho.</h2>
            <p>
              A gente te ajuda a criar sua loja, sem custo adicional. E quando precisar, nosso suporte humano está no
              WhatsApp.
            </p>
            <a
              className="primary-link"
              href={getSupportUrl("Oi! Quero ajuda gratuita para criar minha loja na KIZI.")}
              target="_blank"
              rel="noreferrer"
            >
              Falar com uma pessoa no WhatsApp
              <span aria-hidden="true"> ↗</span>
            </a>
          </div>
          <div className="resource-grid">
            {resources.map((item, index) => (
              <article className="resource-card" key={item.title}>
                <span className="resource-number">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section plans-section" id="planos">
        <div className="section-header">
          <span>Planos simples</span>
          <h2>Comece grátis. Evolua no seu tempo.</h2>
          <p>
            Valide pelo WhatsApp ou venda com pagamento e envio integrados.
          </p>
        </div>

        <div className="plans-grid">
          {plans.map((plan) => (
            <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a
                className={plan.featured ? "primary-link" : "secondary-link"}
                href="#criar"
                onClick={() => trackAnalytics("signup_cta_clicked", {
                  placement: "pricing",
                  plan: plan.name.toLowerCase(),
                })}
              >
                {plan.action}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-section">
        <div className="section-header">
          <span>Duvidas comuns</span>
          <h2>Sem enrolação.</h2>
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
        <div>
          <strong>KIZI</strong>
          <p>Uma forma mais simples de levar seu negócio para o digital.</p>
        </div>
        <div className="footer-links">
          <a href="/privacidade.html">Privacidade</a>
          {hasAnalyticsConfigured() && (
            <button className="cookie-preferences" type="button" onClick={() => setCookiesVisible(true)}>
              Preferências de cookies
            </button>
          )}
          <a
            className="primary-link"
            href="#criar"
            onClick={() => trackAnalytics("signup_cta_clicked", { placement: "footer" })}
          >
            Criar minha loja
          </a>
        </div>
      </footer>
      {cookiesVisible && (
        <div className="cookie-banner" role="dialog" aria-label="Preferências de cookies">
          <p>
            Usamos cookies essenciais e, se você permitir, métricas do Google Analytics e
            PostHog para entender o uso do portal e melhorar a experiência. Você pode mudar
            sua escolha a qualquer momento em Preferências de cookies. <a href="/privacidade.html">Saiba mais</a>.
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
        className="mobile-fixed-cta"
        href="#criar"
        onClick={() => trackAnalytics("signup_cta_clicked", { placement: "mobile_fixed" })}
      >
        Criar minha loja
      </a>
    </main>
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
