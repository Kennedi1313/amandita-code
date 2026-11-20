import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCopy,
  FiPackage,
  FiShoppingBag,
} from "react-icons/fi";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import {
  getGuestMercadoPagoSaleStatus,
  getMercadoPagoSaleStatus,
} from "@/lib/client";

const Success = () => {
  const router = useRouter();
  const { clearCart } = useShoppingCart();
  const [saleStatus, setSaleStatus] = useState("PENDENTE");
  const [checkingTimedOut, setCheckingTimedOut] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isMercadoPago = router.query.provider === "mercadopago";
  const saleId = Array.isArray(router.query.saleId)
    ? router.query.saleId[0]
    : router.query.saleId;
  const guestToken = Array.isArray(router.query.guestToken)
    ? router.query.guestToken[0]
    : router.query.guestToken;
  const isGuestOrder = Boolean(guestToken);
  const orderConfirmed =
    !isMercadoPago ||
    ["APROVADO", "PREPARANDO", "ENVIADO", "ENTREGUE"].includes(saleStatus);
  const paymentRejected =
    saleStatus === "RECUSADO" || saleStatus === "CANCELADO";

  useEffect(() => {
    if (!router.isReady) return;
    if (!isMercadoPago || orderConfirmed) clearCart();
  }, [clearCart, isMercadoPago, orderConfirmed, router.isReady]);

  useEffect(() => {
    if (!router.isReady || !isMercadoPago || !saleId) return;
    let cancelled = false;

    const checkStatus = async () => {
      for (let attempt = 0; attempt < 90 && !cancelled; attempt += 1) {
        try {
          const response = guestToken
            ? await getGuestMercadoPagoSaleStatus(saleId, guestToken)
            : await getMercadoPagoSaleStatus(saleId);
          const status = String(
            response.data?.status || "PENDENTE",
          ).toUpperCase();
          if (!cancelled) setSaleStatus(status);
          if (
            [
              "APROVADO",
              "PREPARANDO",
              "ENVIADO",
              "ENTREGUE",
              "RECUSADO",
              "CANCELADO",
            ].includes(status)
          )
            return;
        } catch {
          if (!cancelled) setSaleStatus("PENDENTE");
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!cancelled) setCheckingTimedOut(true);
    };
    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, isMercadoPago, saleId, guestToken]);

  const orderMessage = isGuestOrder
    ? "O pedido está vinculado ao e-mail informado. Guarde este link para acompanhar o andamento sem criar uma conta."
    : {
        APROVADO:
          "Recebemos seu pedido com sucesso. Você já pode acompanhar tudo em Minhas compras.",
        PREPARANDO:
          "Seu pagamento foi confirmado e a loja já está preparando o pedido.",
        ENVIADO:
          "Seu pedido já foi enviado. Acompanhe o rastreio em Minhas compras.",
        ENTREGUE:
          "Seu pedido foi entregue. Consulte os detalhes em Minhas compras.",
      }[saleStatus] ||
      "Estamos confirmando seu pagamento. Você pode acompanhar o pedido em Minhas compras.";

  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
    } catch {
      window.prompt(
        "Copie o link seguro de acompanhamento do pedido:",
        window.location.href,
      );
    }
  };

  return (
    <main className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[70vh]">
      <Head>
        <meta name="referrer" content="no-referrer" />
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <section className="rounded-md border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${paymentRejected ? "bg-red-50 text-red-600" : orderConfirmed ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}
        >
          {paymentRejected ? (
            <FiAlertCircle className="h-7 w-7" />
          ) : orderConfirmed ? (
            <FiCheckCircle className="h-7 w-7" />
          ) : (
            <FiAlertCircle className="h-7 w-7" />
          )}
        </div>
        <p
          className={`mt-5 text-sm uppercase tracking-wide ${paymentRejected ? "text-red-700" : orderConfirmed ? "text-green-700" : "text-amber-700"}`}
        >
          {paymentRejected
            ? "Pagamento não aprovado"
            : orderConfirmed
              ? "Pedido confirmado"
              : "Aguardando confirmação"}
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold text-gray-950">
          {paymentRejected
            ? "Não foi possível confirmar o pagamento"
            : orderConfirmed
              ? saleStatus === "PREPARANDO"
                ? "Pedido em preparo"
                : saleStatus === "ENVIADO"
                  ? "Pedido enviado"
                  : saleStatus === "ENTREGUE"
                    ? "Pedido entregue"
                    : "Pedido confirmado"
              : "Estamos confirmando seu pagamento"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-gray-600">
          {paymentRejected
            ? "O pedido permanece registrado, mas o pagamento não foi aprovado. Você pode tentar novamente ou falar com a loja."
            : checkingTimedOut
              ? isGuestOrder
                ? "Ainda estamos aguardando a confirmação. Mantenha este link para consultar o pedido depois."
                : "Ainda estamos aguardando a confirmação do pagamento. Você pode acompanhar o pedido em Minhas compras; a atualização acontece quando o banco confirmar."
              : orderMessage}
        </p>

        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 text-left md:grid-cols-2">
          <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
            <FiPackage className="text-xl text-black-1000" />
            <p className="mt-2 font-semibold text-gray-950">Próximo passo</p>
            <p className="mt-1 text-sm text-gray-600">
              {isGuestOrder
                ? "A loja recebe a confirmação do pagamento e prepara seu pedido. Você não precisa criar uma conta."
                : "A loja acompanha o pagamento e prepara seu pedido. Consulte as atualizações no histórico."}
            </p>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
            <FiShoppingBag className="text-xl text-black-1000" />
            <p className="mt-2 font-semibold text-gray-950">Acompanhe</p>
            <p className="mt-1 text-sm text-gray-600">
              {isGuestOrder
                ? "Guarde o link seguro desta página. Ele abre este pedido sem exigir cadastro."
                : "Status, produtos e detalhes ficam salvos em Minhas compras."}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          {isGuestOrder ? (
            <button
              type="button"
              onClick={copyTrackingLink}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black-1000 px-5 font-semibold text-white transition hover:opacity-90"
            >
              <FiCopy aria-hidden="true" />{" "}
              {linkCopied ? "Link copiado" : "Copiar link seguro do pedido"}
            </button>
          ) : (
            <Link
              href="/sales"
              className="inline-flex h-11 items-center justify-center rounded-md bg-black-1000 px-5 font-semibold text-white transition hover:opacity-90"
            >
              Ver minhas compras
            </Link>
          )}
          {paymentRejected && (
            <Link
              href="/checkout"
              className="inline-flex h-11 items-center justify-center rounded-md border border-gray-200 px-5 font-semibold text-gray-700 transition hover:border-gray-300"
            >
              Tentar novamente
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md border border-gray-200 px-5 font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Continuar comprando
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Success;
