import { useEffect, useMemo, useState } from "react";
import {
  FiActivity as Activity,
  FiArrowLeft as ArrowLeft,
  FiArrowUpRight as ArrowUpRight,
  FiBriefcase as Building2,
  FiCheck as Check,
  FiChevronDown as ChevronDown,
  FiDollarSign as CircleDollarSign,
  FiClock as Clock,
  FiCreditCard as CreditCard,
  FiExternalLink as ExternalLink,
  FiHome as Home,
  FiLogOut as LogOut,
  FiTrendingUp as TrendingUp,
  FiSearch as Search,
  FiTruck as Truck,
} from "react-icons/fi";

const API_URL =
  import.meta.env.VITE_API_RUNTIME_URL ||
  import.meta.env.VITE_API_BUILD_URL ||
  "http://localhost:8080/api/v1";
const ACCESS_TOKEN_KEY = "kizi-platform-admin-access-token";

const formatMoney = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);

function readRoute() {
  const storeRoute = window.location.pathname.match(/^\/stores\/(\d+)\/?$/);
  if (storeRoute) return { view: "detail", storeId: Number(storeRoute[1]) };
  if (window.location.pathname.replace(/\/+$/, "") === "/stores") {
    return { view: "stores", storeId: null };
  }
  return { view: "overview", storeId: null };
}

export default function App() {
  const [platformToken, setPlatformToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.sessionStorage.getItem(ACCESS_TOKEN_KEY) || "",
  );
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("TODOS");
  const [activeView, setActiveView] = useState(() => readRoute().view);
  const [period, setPeriod] = useState(30);
  const [chartMetric, setChartMetric] = useState("revenue");
  const [selectedStoreId, setSelectedStoreId] = useState(() => readRoute().storeId);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeDetail, setStoreDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function platformAdminFetch(url, token = platformToken) {
    const response = await fetch(url, {
      headers: { "X-Platform-Admin-Token": token },
    });
    if (response.status === 401) {
      window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      setPlatformToken("");
      setAuthError("Sua sessão expirou. Entre novamente.");
    }
    return response;
  }

  async function signIn(event) {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setAuthError("Informe o token de acesso.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await platformAdminFetch(
        API_URL + "/platform-admin/overview?days=30",
        token,
      );
      if (response.status === 503) {
        setAuthError("O acesso ao painel ainda não foi configurado no servidor.");
        return;
      }
      if (!response.ok) {
        setAuthError("Token inválido. Confira e tente novamente.");
        return;
      }

      const data = await response.json();
      window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      setPlatformToken(token);
      setOverview(data);
      setPeriod(30);
      setAuthError("");
    } catch {
      setAuthError("Não foi possível conectar à API da KIZI.");
    } finally {
      setAuthLoading(false);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    setPlatformToken("");
    setTokenInput("");
    setOverview(null);
    setSelectedStore(null);
    setStoreDetail(null);
    setAuthError("");
  }

  async function loadOverview(days = period) {
    if (!platformToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await platformAdminFetch(
        API_URL + "/platform-admin/overview?days=" + days,
      );
      if (!response.ok) throw new Error("Não foi possível carregar os dados.");
      setOverview(await response.json());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStoreDetail(storeId, days = period) {
    if (!platformToken) return;
    if (!overview) loadOverview(days);
    setDetailLoading(true);
    setError("");
    try {
      const response = await platformAdminFetch(
        API_URL + "/platform-admin/stores/" + storeId + "?days=" + days,
      );
      if (!response.ok) throw new Error("Não foi possível carregar os detalhes da loja.");
      const loadedDetail = await response.json();
      setStoreDetail(loadedDetail);
      setSelectedStore(loadedDetail.store);
    } catch (requestError) {
      setError(requestError.message);
      setStoreDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!platformToken) return;
    if (activeView === "detail" && selectedStoreId) {
      loadStoreDetail(selectedStoreId, period);
      return;
    }
    loadOverview(period);
  }, [period, activeView, selectedStoreId, platformToken]);

  function navigateTo(view) {
    window.history.pushState({}, "", view === "overview" ? "/" : "/stores");
    setActiveView(view);
    if (view !== "detail") setSelectedStoreId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openStore(store) {
    window.history.pushState({}, "", "/stores/" + store.id);
    setSelectedStoreId(store.id);
    setSelectedStore(store);
    setStoreDetail(null);
    setActiveView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const handlePopState = () => {
      const route = readRoute();
      setActiveView(route.view);
      setSelectedStoreId(route.storeId);
      if (route.storeId) {
        const store = overview?.stores?.find((item) => item.id === route.storeId);
        if (store) setSelectedStore(store);
      }
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [overview]);

  const stores = useMemo(() => {
    const allStores = overview?.stores || [];
    return allStores.filter((store) => {
      const searchable = [
        store.name,
        store.domain,
        store.ownerName,
        store.ownerEmail,
      ].join(" ").toLowerCase();
      const matchesSearch = searchable.includes(query.toLowerCase());
      const matchesPlan = planFilter === "TODOS" || store.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [overview, query, planFilter]);

  const total = overview?.totalStores || 0;
  const completeShare = total
    ? Math.round((overview.completeStores / total) * 100)
    : 0;

  if (!platformToken) {
    return (
      <main className="platform-auth-screen">
        <form className="platform-auth-card" onSubmit={signIn}>
          <img src="/brand-mark-dark.png" alt="KIZI" />
          <p className="eyebrow">ÁREA RESTRITA</p>
          <h1>Admin da plataforma</h1>
          <p className="platform-auth-copy">
            Entre com o token privado configurado no servidor KIZI.
          </p>
          <label htmlFor="platform-admin-token">Token de acesso</label>
          <input
            id="platform-admin-token"
            autoComplete="current-password"
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Token privado"
          />
          {authError && <div className="error-banner">{authError}</div>}
          <button className="primary-button" type="submit" disabled={authLoading}>
            {authLoading ? "Validando…" : "Entrar"}
          </button>
          <small>O token fica apenas nesta sessão do navegador.</small>
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="brand-logo" src="/brand-mark-dark.png" alt="KIZI" />
          <div><b>KIZI</b><small>PLATAFORMA</small></div>
        </div>
        <div className="workspace">
          <span className="workspace-icon">A</span>
          <span><b>Minha plataforma</b><small>Visão geral</small></span>
          <ChevronDown size={15} />
        </div>
        <p className="nav-caption">GESTÃO</p>
        <button className={"nav-item " + (activeView === "overview" ? "active" : "")}
          onClick={() => navigateTo("overview")}><Home size={17} /> Visão geral</button>
        <button className={"nav-item " + (activeView === "stores" ? "active" : "")}
          onClick={() => navigateTo("stores")}>
          <Building2 size={17} /> Lojas <span className="nav-count">{total}</span>
        </button>
        <p className="nav-caption support-caption">SUPORTE</p>
        <div className="sidebar-bottom">
          <div className="profile-avatar">A</div>
          <div className="profile-label"><b>Administradora</b><small>Plataforma</small></div>
          <button
            className="icon-button sign-out-button"
            type="button"
            title="Sair do admin da plataforma"
            aria-label="Sair do admin da plataforma"
            onClick={signOut}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">KIZI <span>/</span> <b>
            {activeView === "detail"
              ? selectedStore?.name || "Detalhes da loja"
              : activeView === "stores" ? "Lojas" : "Visão geral"}
          </b></div>
          <div className="topbar-right">
            <span className="live-pill"><i /> Dados atualizados</span>
            <button className="icon-button" title="Atualizar" onClick={() => activeView === "detail"
              ? loadStoreDetail(selectedStoreId, period)
              : loadOverview(period)}>
              <Activity size={17} />
            </button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {activeView === "detail" ? "DETALHES DA LOJA" : activeView === "stores" ? "BASE DE LOJAS" : "CONTROLE DA PLATAFORMA"}
              </p>
              <h1>{activeView === "detail"
                ? storeDetail?.store?.name || selectedStore?.name || "Carregando loja…"
                : activeView === "stores" ? "Lojas" : "Visão geral"}</h1>
              <p className="muted">{activeView === "detail"
                ? storeDetail?.store?.domain || selectedStore?.domain || "Dados cadastrais, operação e desempenho."
                : activeView === "stores"
                  ? "Acompanhe cadastro, plano, operação e vendas de cada loja."
                  : "Acompanhe o crescimento e a atividade das lojas no lançamento."}</p>
            </div>
            {activeView === "overview" && <div className="heading-actions">
              <label className="period-select">
                <span>Período</span>
                <select value={period} onChange={(event) => setPeriod(Number(event.target.value))}>
                  <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option>
                </select>
              </label>
              <button className="outline-button" onClick={() => loadOverview(period)}>
              {loading ? "Atualizando…" : "Atualizar dados"}
              </button>
            </div>}
          </div>
          {error && <div className="error-banner">{error}</div>}

          {activeView === "overview" && <>
          <section className="metric-grid">
            <MetricCard label="Lojas cadastradas" value={overview?.totalStores ?? "—"}
              hint="na plataforma" icon={<Building2 />} tone="green" />
            <MetricCard label="Novas lojas" value={overview?.storesCreatedInPeriod ?? "—"}
              hint={(overview?.storesCreatedToday ?? 0) + " hoje"} icon={<ArrowUpRight />} tone="purple" />
            <MetricCard label="Pedidos no período" value={overview?.salesInPeriod ?? "—"}
              hint="em todas as lojas" icon={<CreditCard />} tone="blue" />
            <MetricCard label="Faturamento confirmado" value={formatMoney(overview?.confirmedRevenueInPeriod)}
              hint="pedidos pagos ou em andamento" icon={<CircleDollarSign />} tone="amber" />
          </section>

          <section className="analytics-grid">
            <article className="panel trend-panel">
              <div className="panel-heading">
                <div><h2>Atividade no lançamento</h2>
                  <p>Faturamento confirmado e pedidos nos últimos {overview?.periodDays || period} dias.</p></div>
                <div className="chart-toggle">
                  <button className={chartMetric === "revenue" ? "selected" : ""}
                    onClick={() => setChartMetric("revenue")}>Faturamento</button>
                  <button className={chartMetric === "orders" ? "selected" : ""}
                    onClick={() => setChartMetric("orders")}>Pedidos</button>
                </div>
              </div>
              <TrendChart data={overview?.salesTrend || []}
                valueKey={chartMetric === "revenue" ? "confirmedRevenue" : "count"}
                formatter={chartMetric === "revenue" ? formatMoney : (value) => value} />
            </article>
            <article className="panel launch-panel">
              <div className="panel-heading">
                <div><h2>Operação das lojas</h2><p>Pedidos registrados em todos os estados</p></div>
                <TrendingUp size={18} className="heading-icon" />
              </div>
              <div className="status-grid">
                <StatusCount label="Ativas no período" value={overview?.activeStoresInPeriod ?? 0} tone="green" />
                <StatusCount label="Aguardando pagamento" value={overview?.pendingSales ?? 0} tone="amber" />
                <StatusCount label="Aprovados" value={overview?.approvedSales ?? 0} tone="blue" />
                <StatusCount label="Cancelados / recusados" value={(overview?.cancelledSales ?? 0) + (overview?.rejectedSales ?? 0)} tone="muted" />
              </div>
              <div className="launch-foot"><Clock size={14} /> Ativa = teve ao menos uma venda aprovada no período.</div>
            </article>
          </section>

          <section className="insight-grid">
            <article className="panel">
              <div className="panel-heading">
                <div><h2>Planos da plataforma</h2><p>Distribuição atual da base de lojas</p></div>
                <span className="subtle-label">AGORA</span>
              </div>
              <div className="plan-summary">
                <div><span className="legend-dot pro" />Plano Completo <b>{overview?.completeStores ?? 0}</b></div>
                <div><span className="legend-dot free" />Plano Grátis <b>{overview?.freeStores ?? 0}</b></div>
              </div>
              <div className="stacked-bar">
                <span style={{ width: completeShare + "%" }} />
                <i style={{ width: (100 - completeShare) + "%" }} />
              </div>
              <div className="bar-caption"><span>{completeShare}% Completo</span><span>{100 - completeShare}% Grátis</span></div>
              <div className="insight-note"><span className="note-icon"><ArrowUpRight size={16} /></span>
                <span><b>{overview?.completeStores ?? 0} lojas</b> estão no Plano Completo</span></div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div><h2>Integrações das lojas</h2><p>Conexões configuradas na plataforma</p></div>
                <CreditCard size={18} className="heading-icon" />
              </div>
              <IntegrationRow icon={<CreditCard />} label="Mercado Pago"
                count={overview?.mercadoPagoStores} total={total} tone="green" />
              <IntegrationRow icon={<CircleDollarSign />} label="Asaas"
                count={overview?.asaasStores} total={total} tone="purple" />
              <IntegrationRow icon={<Truck />} label="Melhor Envio"
                count={overview?.melhorEnvioStores} total={total} tone="blue" />
              <div className="integration-foot"><span><Check size={14} /> Apenas status de conexão</span>
                <button onClick={() => navigateTo("stores")}>Ver lojas <ArrowUpRight size={14} /></button></div>
            </article>
          </section>

          <section className="panel analytics-setup-panel">
            <div className="panel-heading">
              <div><h2>Analytics do lançamento</h2>
                <p>Acompanhamento de visitas e conversão do portal.</p></div>
              <Activity size={18} className="heading-icon" />
            </div>
            <div className="analytics-setup-content">
              <div className="analytics-source">
                <span className="source-mark google">G</span>
                <span><b>Google Analytics</b><small>{overview?.analytics?.googleAnalytics?.message
                  || (overview?.analytics?.googleAnalytics?.available ? "Relatórios carregados" : "Aguardando credencial de leitura")}</small></span>
                <span className={"source-status " + (overview?.analytics?.googleAnalytics?.available ? "connected" : "")}>
                  {overview?.analytics?.googleAnalytics?.available ? "Conectado" : "Pendente"}
                </span>
              </div>
              <div className="analytics-source">
                <span className="source-mark posthog">P</span>
                <span><b>PostHog</b><small>{overview?.analytics?.posthog?.message
                  || (overview?.analytics?.posthog?.available ? "Relatórios carregados" : "Aguardando credencial de leitura")}</small></span>
                <span className={"source-status " + (overview?.analytics?.posthog?.available ? "connected" : "")}>
                  {overview?.analytics?.posthog?.available ? "Conectado" : "Pendente"}
                </span>
              </div>
              <div className="analytics-metrics">
                <div><b>{overview?.analytics?.googleAnalytics?.activeUsers ?? "—"}</b><small>usuários ativos · GA</small></div>
                <div><b>{overview?.analytics?.googleAnalytics?.sessions ?? "—"}</b><small>sessões · GA</small></div>
                <div><b>{overview?.analytics?.posthog?.visitors ?? "—"}</b><small>visitantes únicos · PostHog</small></div>
                <div><b>{overview?.analytics?.posthog?.signupClicks ?? "—"}</b><small>cliques em criar loja</small></div>
                <div><b>{overview?.analytics?.posthog?.storeCreationStarts ?? "—"}</b><small>inícios de cadastro</small></div>
                <div><b>{overview?.analytics?.posthog?.storeCreations ?? "—"}</b><small>lojas criadas · PostHog</small></div>
                <div><b>{overview?.analytics?.posthog?.adminHandoffs ?? "—"}</b><small>acessos ao painel</small></div>
                <div><b>{overview?.analytics?.googleAnalytics?.pageViews ?? "—"}</b><small>visualizações · GA</small></div>
              </div>
              <div className="analytics-read-note">
                <b>Período: últimos {overview?.periodDays || period} dias. Os eventos de aquisição são do portal de cadastro.</b>
                <span>
                  As chaves públicas configuradas no portal enviam eventos, mas
                  a leitura de relatórios exige uma credencial privada no
                  backend. As credenciais nunca são enviadas ao navegador.
                </span>
              </div>
            </div>
          </section>
          </>}

          {activeView === "detail" ? (
            <StoreDetailView
              detail={storeDetail}
              fallbackStore={selectedStore}
              loading={detailLoading}
              period={period}
              onPeriodChange={setPeriod}
              onBack={() => navigateTo("stores")}
            />
          ) : <section className="panel stores-panel">
            <div className="panel-heading stores-heading">
              <div><h2>Lojas da plataforma</h2><p>Cadastro, responsável, plano, integrações e vendas por loja.</p></div>
              <span className="store-total">{stores.length} lojas</span>
            </div>
            <div className="table-tools">
              <label className="search-box"><Search size={17} />
                <input placeholder="Buscar loja, domínio ou responsável"
                  value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <div className="filter-tabs">
                <button className={planFilter === "TODOS" ? "selected" : ""} onClick={() => setPlanFilter("TODOS")}>Todas</button>
                <button className={planFilter === "COMPLETE" ? "selected" : ""} onClick={() => setPlanFilter("COMPLETE")}>Completo</button>
                <button className={planFilter === "FREE" ? "selected" : ""} onClick={() => setPlanFilter("FREE")}>Grátis</button>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>LOJA</th><th>RESPONSÁVEL</th><th>PLANO</th><th>INTEGRAÇÕES</th><th>PEDIDOS</th><th>FATURAMENTO CONFIRMADO</th><th /></tr></thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id}>
                      <td><button className="store-name-button" onClick={() => openStore(store)}>
                        <div className="store-name">
                          <span className="store-avatar">{(store.name || "L").slice(0, 1).toUpperCase()}</span>
                          <span><b>{store.name || "Loja sem nome"}</b><small>{store.domain || "Domínio não configurado"}</small></span>
                        </div>
                      </button></td>
                      <td><div className="owner-cell"><b>{store.ownerName || "Não informado"}</b><small>{store.ownerEmail || "—"}</small></div></td>
                      <td><span className={"plan-badge " + (store.plan === "COMPLETE" ? "complete" : "free")}><i />
                        {store.plan === "COMPLETE" ? "Completo" : "Grátis"}</span></td>
                      <td><IntegrationChips store={store} /></td>
                      <td className="numeric">{store.salesCount}</td>
                      <td className="numeric strong">{formatMoney(store.salesRevenue)}</td>
                      <td>{store.domain && <a className="row-link" href={"https://" + store.domain}
                        target="_blank" rel="noreferrer" title="Abrir loja"><ExternalLink size={15} /></a>}</td>
                    </tr>
                  ))}
                  {!stores.length && <tr><td colSpan="7" className="empty-state">
                    {loading ? "Carregando lojas…" : "Nenhuma loja encontrada."}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Exibindo {stores.length} de {total} lojas</span>
              <span>Faturamento confirmado · pedidos cancelados e recusados fora do valor</span></div>
          </section>}
          <footer className="page-footer">KIZI Plataforma <span>·</span> Painel administrativo</footer>
        </div>
      </main>
    </div>
  );
}

function StatusCount({ label, value, tone }) {
  return <div className="status-count"><span className={"status-dot " + tone} /><div><b>{value}</b><small>{label}</small></div></div>;
}

function StoreDetailView({
  detail,
  fallbackStore,
  loading,
  period,
  onPeriodChange,
  onBack,
}) {
  const store = detail?.store || fallbackStore;
  const subscriptionStatus = {
    authorized: "Ativa",
    pending: "Pendente",
    cancelled: "Cancelada",
    canceled: "Cancelada",
    paused: "Pausada",
  }[detail?.mercadoPagoSubscriptionStatus] ||
    detail?.mercadoPagoSubscriptionStatus ||
    "Sem assinatura";

  return (
    <div className="store-detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={15} /> Voltar para lojas
      </button>

      {loading && !detail ? (
        <section className="panel detail-loading">Carregando dados da loja…</section>
      ) : store ? (
        <>
          <section className="detail-metric-grid">
            <MetricCard label="Plano" value={store.plan === "COMPLETE" ? "Completo" : "Grátis"}
              hint={detail?.subscriptionEverPaid ? "já teve pagamento confirmado" : "plano atual"}
              icon={<TrendingUp />} tone="purple" />
            <MetricCard label="Pedidos cadastrados" value={store.salesCount}
              hint="inclui todos os status" icon={<CreditCard />} tone="blue" />
            <MetricCard label="Faturamento confirmado" value={formatMoney(store.salesRevenue)}
              hint="acumulado, sem cancelados ou recusados" icon={<CircleDollarSign />} tone="green" />
            <MetricCard label="Assinatura KIZI" value={subscriptionStatus}
              hint="status recebido do Mercado Pago" icon={<Activity />} tone="amber" />
          </section>

          <section className="detail-grid">
            <article className="panel detail-panel">
              <div className="panel-heading">
                <div><h2>Cadastro e responsável</h2><p>Dados principais da loja.</p></div>
              </div>
              <DetailRow label="Responsável" value={store.ownerName || "Não informado"} />
              <DetailRow label="E-mail" value={store.ownerEmail || "Não informado"} />
              <DetailRow label="Domínio" value={store.domain || "Não configurado"} />
              <DetailRow label="Criada em" value={formatDate(store.createdAt)} />
              <DetailRow label="Plano" value={store.plan === "COMPLETE" ? "Completo" : "Grátis"} />
              <DetailRow label="Último pagamento da assinatura"
                value={detail?.lastSubscriptionPaymentAt
                  ? formatDate(detail.lastSubscriptionPaymentAt)
                  : "Ainda não consta no histórico"} />
              <DetailRow label="Próximo pagamento agendado"
                value={detail?.nextSubscriptionPaymentAt
                  ? formatDate(detail.nextSubscriptionPaymentAt)
                  : "Sem próxima cobrança agendada"} />
            </article>

            <article className="panel detail-panel">
              <div className="panel-heading">
                <div><h2>Integrações e operação</h2><p>Serviços e opções habilitados nesta loja.</p></div>
              </div>
              <IntegrationStatus label="Mercado Pago"
                connected={store.mercadoPagoConnected}
                detail={store.mercadoPagoConnected ? "Conectado para receber pagamentos" : "Ainda não conectado"} />
              <IntegrationStatus label="Asaas"
                connected={store.asaasConnected}
                detail={store.asaasConnected ? "Carteira vinculada" : "Ainda não conectado"} />
              <IntegrationStatus label="Melhor Envio"
                connected={store.melhorEnvioConnected}
                detail={store.melhorEnvioConnected ? "Conta conectada" : "Ainda não conectado"} />
              <IntegrationStatus label="Retirada na loja"
                connected={store.pickupEnabled}
                detail={store.pickupAddressConfigured ? "Ativa · endereço configurado" : store.pickupEnabled ? "Ativa · revisar endereço" : "Desativada"} />
              <IntegrationStatus label="Entrega local"
                connected={store.localDeliveryEnabled}
                detail={store.localDeliveryEnabled
                  ? (store.localDeliveryEta || "Prazo não informado") + " · taxa " +
                    formatMoney((store.localDeliveryFee || 0) / 100)
                  : "Desativada"} />
              {store.freeShippingMinAmount > 0 && (
                <DetailRow label="Frete local grátis a partir de"
                  value={formatMoney(store.freeShippingMinAmount / 100)} />
              )}
            </article>
          </section>

          <section className="panel detail-performance">
            <div className="panel-heading">
              <div><h2>Desempenho da loja</h2>
                <p>Pedidos e faturamento confirmado no período selecionado.</p></div>
              <label className="period-select">
                <span>Período</span>
                <select value={period} onChange={(event) => onPeriodChange(Number(event.target.value))}>
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </label>
            </div>
            {detail ? (
              <>
                <div className="detail-period-summary">
                  <div><b>{detail.ordersInPeriod}</b><small>pedidos no período</small></div>
                  <div><b>{formatMoney(detail.confirmedRevenueInPeriod)}</b><small>faturamento confirmado</small></div>
                  <div><b>{detail.pendingOrders}</b><small>aguardando pagamento</small></div>
                </div>
                <TrendChart data={detail.salesTrend || []}
                  valueKey="confirmedRevenue" formatter={formatMoney} />
              </>
            ) : <div className="empty-state">Não há dados de desempenho disponíveis.</div>}
          </section>

          <section className="panel status-detail-panel">
            <div className="panel-heading">
              <div><h2>Pedidos por status</h2><p>Contagem acumulada da loja.</p></div>
            </div>
            <div className="order-breakdown">
              <StatusCount label="Aguardando pagamento" value={detail?.pendingOrders ?? 0} tone="amber" />
              <StatusCount label="Pagos" value={detail?.approvedOrders ?? 0} tone="green" />
              <StatusCount label="Em separação" value={detail?.preparingOrders ?? 0} tone="blue" />
              <StatusCount label="Enviados" value={detail?.shippedOrders ?? 0} tone="blue" />
              <StatusCount label="Entregues" value={detail?.deliveredOrders ?? 0} tone="green" />
              <StatusCount label="Cancelados" value={detail?.cancelledOrders ?? 0} tone="muted" />
              <StatusCount label="Recusados" value={detail?.rejectedOrders ?? 0} tone="muted" />
            </div>
          </section>

          <section className="panel detail-orders">
            <div className="panel-heading">
              <div><h2>Pedidos recentes</h2><p>Os dez pedidos mais recentes desta loja.</p></div>
              <span className="store-total">{detail?.recentOrders?.length || 0} pedidos</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>PEDIDO</th><th>DATA</th><th>PAGAMENTO</th><th>STATUS</th></tr></thead>
                <tbody>
                  {detail?.recentOrders?.map((order) => (
                    <tr key={order.id}>
                      <td className="strong">#{order.id}</td>
                      <td>{formatDate(order.date)}</td>
                      <td>{paymentLabel(order.paymentMethod)}</td>
                      <td><span className={"order-status " + statusTone(order.status)}>{statusLabel(order.status)}</span></td>
                    </tr>
                  ))}
                  {!detail?.recentOrders?.length && (
                    <tr><td colSpan="4" className="empty-state">
                      {loading ? "Carregando pedidos…" : "Esta loja ainda não tem pedidos."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : <section className="panel detail-loading">Não foi possível carregar os detalhes desta loja.</section>}
    </div>
  );
}

function DetailRow({ label, value }) {
  return <div className="detail-row"><span>{label}</span><b>{value}</b></div>;
}

function IntegrationStatus({ label, connected, detail }) {
  return (
    <div className="integration-status">
      <span className={"integration-state-dot " + (connected ? "connected" : "")} />
      <div><b>{label}</b><small>{detail}</small></div>
      <span className={"connection-label " + (connected ? "connected" : "")}>
        {connected ? "Ativa" : "Inativa"}
      </span>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(date);
}

function statusLabel(value) {
  return ({
    PENDENTE: "Pendente",
    APROVADO: "Pago",
    PREPARANDO: "Em separação",
    ENVIADO: "Enviado",
    ENTREGUE: "Entregue",
    CANCELADO: "Cancelado",
    RECUSADO: "Recusado",
  })[value] || value || "Não informado";
}

function statusTone(value) {
  if (["APROVADO", "PREPARANDO", "ENVIADO", "ENTREGUE"].includes(value)) return "confirmed";
  if (value === "PENDENTE") return "pending";
  if (["CANCELADO", "RECUSADO"].includes(value)) return "cancelled";
  return "";
}

function paymentLabel(value) {
  return ({
    MERCADO_PAGO: "Mercado Pago",
    ASAAS: "Asaas",
    PIX: "Pix",
    CREDIT_CARD: "Cartão de crédito",
    "CREDIT-CARD": "Cartão de crédito",
  })[value] || value || "Não informado";
}

function TrendChart({ data, valueKey, formatter }) {
  const values = data.map((item) => Number(item[valueKey] || 0));
  const maxValue = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length < 2 ? 170 : 12 + (index / (values.length - 1)) * 316;
    const y = 94 - (value / maxValue) * 76;
    return x + "," + y;
  }).join(" ");
  const latest = values[values.length - 1] || 0;
  const peak = maxValue;
  return (
    <div className="chart-wrap">
      <div className="chart-summary"><strong>{formatter(latest)}</strong><span>último dia</span>
        <small>pico: {formatter(peak)}</small></div>
      <svg className="trend-chart" viewBox="0 0 340 112" preserveAspectRatio="none" role="img" aria-label="Gráfico de atividade por dia">
        <line x1="8" y1="18" x2="332" y2="18" />
        <line x1="8" y1="56" x2="332" y2="56" />
        <line x1="8" y1="94" x2="332" y2="94" />
        {values.length > 1 && <polyline points={points} />}
        {values.length === 1 && <circle cx="170" cy="18" r="4" />}
      </svg>
      <div className="chart-dates">
        <span>{data[0]?.date || "—"}</span>
        <span>{data[Math.floor(data.length / 2)]?.date || "—"}</span>
        <span>{data[data.length - 1]?.date || "—"}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon, tone }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className={"metric-icon " + tone}>{icon}</span></div>
      <strong>{value}</strong><small><i />{hint}</small>
    </article>
  );
}

function IntegrationRow({ icon, label, count = 0, total, tone }) {
  const percentage = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="integration-row">
      <span className={"integration-icon " + tone}>{icon}</span>
      <div className="integration-info">
        <div><b>{label}</b><span>{count || 0} lojas <small>· {percentage}%</small></span></div>
        <div className="mini-progress"><i style={{ width: percentage + "%" }} /></div>
      </div>
    </div>
  );
}

function IntegrationChips({ store }) {
  const items = [
    [store.mercadoPagoConnected, "Mercado Pago"],
    [store.asaasConnected, "Asaas"],
    [store.melhorEnvioConnected, "Melhor Envio"],
    [store.pickupEnabled, "Retirada"],
    [store.localDeliveryEnabled, "Entrega local"],
  ];
  const active = items.filter((item) => item[0]);
  return active.length
    ? <div className="integration-chips">{active.map((item) =>
      <span key={item[1]}>{item[1]}</span>)}</div>
    : <small className="muted">Sem integrações</small>;
}
