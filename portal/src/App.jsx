import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1")
  .replace(/\/+$/, "");
const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "mostradigital.com.br";
const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:4173";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
  "No ar em minutos",
  "Painel simples",
  "Comece grátis",
  "Venda Online",
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
    title: "Vitrine pronta",
    text: "Logo, banner, categorias e produtos organizados.",
  },
  {
    title: "WhatsApp primeiro",
    text: "Valide sua loja antes de configurar pagamento.",
  },
  {
    title: "Pedidos claros",
    text: "Acompanhe pagamento, cliente e preparo.",
  },
  {
    title: "Cresce junto",
    text: "Pix, cartão e envio quando fizer sentido.",
  },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "para validar a loja",
    description: "Vitrine simples para começar pelo contato direto.",
    features: [
      "Até 10 produtos",
      "Até 3 imagens por produto",
      "Pedidos combinados pelo WhatsApp",
      "Categorias e visual básico da loja",
      "Sem meio de pagamento integrado",
    ],
    action: "Começar grátis",
  },
  {
    name: "Pro",
    price: "R$ 29,90",
    period: "por mes",
    description: "Pagamento online, entrega e mais espaço para crescer.",
    features: [
      "Produtos e imagens liberados",
      "Pix e cartão via Asaas",
      "Envio com Melhor Envio",
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
    title: "Quando uso Pix, cartão e frete?",
    text: "No Pro, quando sua operação pedir mais estrutura.",
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
          <a className="brand" href="#top" aria-label="Mostra Digital">
            <img className="brand-mark" src="/logo.png" alt="" />
            <div>
              <strong>Mostra Digital</strong>
              <span>loja simples para vender rápido</span>
            </div>
          </a>
          <div className="nav-links">
            <a href="#planos">Planos</a>
            <a style={{marginLeft:"14px"}} href="#criar">Criar loja</a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Loja online simples</p>
            <h1>Venda rápido com uma loja fácil de montar.</h1>
            <p className="lead">
              Coloque produtos no ar, receba pedidos e cuide da loja em um
              painel direto. Sem site complicado. Sem depender de planilha.
            </p>

            <div className="hero-actions">
              <a className="primary-link" href="#criar">Criar loja grátis</a>
              <a className="secondary-link" href="#planos">Ver planos</a>
            </div>

            <div className="highlight-list">
              {highlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="app-preview">
              <div className="preview-toolbar">
                <span />
                <span />
                <span />
                <strong>{previewDomain}</strong>
              </div>
              <div className="preview-body">
                <div>
                  <small>Pedido recebido</small>
                  <strong>R$ 248,90</strong>
                  <span>2 produtos · entrega local</span>
                </div>
                <div>
                  <small>Próxima ação</small>
                  <strong>Separar pedido</strong>
                  <span>Pedido pronto para atendimento</span>
                </div>
              </div>
            </div>
          </div>

          <section className="signup-card" id="criar">
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

                <p className="google-fallback">
                  Usamos seu Google apenas para criar o acesso ao painel.
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
              <p className={`form-status ${status.type}`}>{status.message}</p>
            )}
          </section>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <span>Da ideia ao primeiro pedido</span>
          <h2>Da ideia ao primeiro pedido.</h2>
          <p>
            O caminho é curto: criar, cadastrar produtos e vender.
          </p>
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

      <section className="section" id="planos">
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
              {plan.featured && <span className="plan-badge">Mais completo</span>}
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

      <section className="section">
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
          <strong>Mostra Digital</strong>
          <p>Loja online simples para vender rapido e operar sozinho.</p>
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
