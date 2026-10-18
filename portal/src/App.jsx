import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  "Sua loja online grátis",
  "Pedidos pelo WhatsApp ou Mercado Pago",
  "Painel fácil de usar",
  "Comece rápido e evolua depois",
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
    title: "A gente te ajuda!",
    text: "Criar a loja é simples, mas se preferir, a gente monta tudo com você.",
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
];

function App() {
  const [step, setStep] = useState("account");
  const [account, setAccount] = useState(initialAccount);
  const [store, setStore] = useState(initialStore);
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [createdStore, setCreatedStore] = useState(null);
  const [status, setStatus] = useState({ type: "idle", message: "" });

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
    setStep("store");
  }, []);

  const createStore = async (event) => {
    event.preventDefault();
    setStatus({ type: "loading", message: "Montando sua loja..." });
    setCreatedStore(null);

    try {
      if (!account.googleCredential) {
        throw new Error("Entre com Google para criar sua loja.");
      }

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
        window.clearInterval(intervalId);
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
            <a href="#criar">Começar grátis</a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Tire sua loja do papel</p>
            <h1>
              Crie sua loja.
              <span> Venda do seu jeito.</span>
            </h1>
            <p className="lead">
              Monte sua loja em 20 minutos e comece a receber pedidos. Teste grátis e evolua quando sua loja estiver
              pronta.
            </p>

            <div className="hero-actions">
              <a className="primary-link" href="#criar">Criar minha loja grátis</a>
              <a className="secondary-link" href="#como-funciona">Conhecer a plataforma</a>
            </div>
            <a
              className="hero-support-link"
              href={getSupportUrl("Oi! Quero ajuda gratuita para criar minha loja na KIZI.")}
              target="_blank"
              rel="noreferrer"
            >
              Prefere ajuda? A gente cria sua loja com você, de graça.
              <span aria-hidden="true"> ↗</span>
            </a>

            <ul className="highlight-list">
              {highlights.map((item) => (
                <li key={item}><span aria-hidden="true">✓</span>{item}</li>
              ))}
            </ul>

            <div className="app-preview">
              <img
                src="/platform-preview.png"
                alt="Prévia do painel KIZI para administrar uma loja online"
              />
            </div>
          </div>

          <section className="signup-card" id="criar">
            <div className="signup-kicker"><span>Comece agora</span><span>Grátis para começar</span></div>
            <div className="progress">
              <span className={step === "account" ? "active" : "done"}>1</span>
              <div />
              <span className={step === "store" ? "active" : step === "done" ? "done" : ""}>2</span>
            </div>

            {step === "account" && (
              <div>
                <div className="card-header">
                  <span>Crie seu acesso</span>
                  <h2>Entre com Google</h2>
                  <p>Um clique para criar sua conta e seguir para o nome da loja.</p>
                </div>

                <GoogleButton onCredential={createAccountWithGoogle} />

                <p className="google-fallback" role="status" aria-live="polite">
                  {GOOGLE_CLIENT_ID
                    ? "Usamos seu Google apenas para criar o acesso ao painel."
                    : "O acesso com Google será habilitado quando estiver configurado para este ambiente."}
                </p>
              </div>
            )}

            {step === "store" && (
              <form onSubmit={createStore}>
                <div className="card-header">
                  <span>Agora sua loja</span>
                  <h2>Nome e endereço</h2>
                  <p>Escolha onde sua loja vai aparecer.</p>
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
                  WhatsApp
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
                  {status.type === "loading" ? "Montando..." : "Criar loja"}
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
                  <span>Loja criada</span>
                  <h2>{createdStore.storeName}</h2>
                  <p>Agora falta completar sua vitrine no painel.</p>
                </div>
                <div className="created-box">
                  <span>Endereço público</span>
                  <strong>{createdStore.domain}</strong>
                </div>
                <button type="button" onClick={goToAdmin}>
                  Entrar no painel
                </button>
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

      <section className="section workflow-section" id="como-funciona">
        <div className="section-header">
          <span>Sem complicação</span>
          <h2>Do primeiro passo ao primeiro pedido.</h2>
          <p>O essencial para colocar sua marca na internet e começar a vender.</p>
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
              <a className={plan.featured ? "primary-link" : "secondary-link"} href="#criar">
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
        <a className="primary-link" href="#criar">Criar minha loja</a>
      </footer>
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
