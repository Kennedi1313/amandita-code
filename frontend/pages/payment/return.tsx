import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FiAlertCircle, FiArrowLeft, FiLoader } from "react-icons/fi";
import {
  getGuestMercadoPagoSaleStatus,
  getMercadoPagoSaleStatus,
} from "@/lib/client";

type ReturnState = "checking" | "pending" | "rejected" | "invalid";

const PaymentReturn = () => {
  const router = useRouter();
  const [returnState, setReturnState] = useState<ReturnState>("checking");
  const [statusChecked, setStatusChecked] = useState(false);
  const provider = String(router.query.provider || "");
  const saleId = Array.isArray(router.query.saleId)
    ? router.query.saleId[0]
    : router.query.saleId;
  const guestToken = Array.isArray(router.query.guestToken)
    ? router.query.guestToken[0]
    : router.query.guestToken;

  useEffect(() => {
    if (!router.isReady) return;
    if (provider !== "mercadopago" || !saleId) {
      setReturnState("invalid");
      setStatusChecked(true);
      return;
    }

    let cancelled = false;
    const checkStatus = async () => {
      for (let attempt = 0; attempt < 5 && !cancelled; attempt += 1) {
        try {
          const response = guestToken
            ? await getGuestMercadoPagoSaleStatus(saleId, guestToken)
            : await getMercadoPagoSaleStatus(saleId);
          const status = String(
            response.data?.status || "PENDENTE",
          ).toUpperCase();

          if (
            ["APROVADO", "PREPARANDO", "ENVIADO", "ENTREGUE"].includes(status)
          ) {
            const query = new URLSearchParams({
              provider: "mercadopago",
              saleId: String(saleId),
              payment: "approved",
            });
            if (guestToken) query.set("guestToken", guestToken);
            router.replace(`/success?${query.toString()}`);
            return;
          }

          if (["RECUSADO", "CANCELADO"].includes(status)) {
            if (!cancelled) setReturnState("rejected");
            break;
          }
        } catch {
          // Retry a few times before showing a safe, non-success state.
        }

        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      if (!cancelled) {
        setReturnState((current) =>
          current === "rejected" ? current : "pending",
        );
        setStatusChecked(true);
      }
    };

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router, provider, saleId, guestToken]);

  const isRejected = returnState === "rejected";
  const isInvalid = returnState === "invalid";
  const title = isRejected
    ? "O pagamento não foi aprovado"
    : isInvalid
      ? "Não encontramos este pagamento"
      : "Pagamento não confirmado";

  return (
    <main className="mx-auto mt-16 min-h-[70vh] w-full max-w-3xl px-4 py-8 md:mt-28 md:py-12">
      <Head>
        <title>Pagamento não concluído</title>
        <meta name="referrer" content="no-referrer" />
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <section className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center shadow-sm sm:px-8">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isRejected ? "bg-red-50 text-red-600" : isInvalid ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}
        >
          {returnState === "checking" ? (
            <FiLoader className="h-7 w-7 animate-spin" aria-hidden="true" />
          ) : isRejected ? (
            <FiAlertCircle className="h-7 w-7" aria-hidden="true" />
          ) : isInvalid ? (
            <FiAlertCircle className="h-7 w-7" aria-hidden="true" />
          ) : (
            <FiAlertCircle className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {returnState === "checking"
            ? "Conferindo o pagamento"
            : "Checkout interrompido"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950 sm:text-3xl">
          {returnState === "checking" ? "Aguarde um instante" : title}
        </h1>
        <p
          className="mx-auto mt-3 max-w-xl text-gray-600"
          role="status"
          aria-live="polite"
        >
          {returnState === "checking"
            ? "Estamos verificando se o Mercado Pago confirmou o pagamento. Não feche esta página."
            : isRejected
              ? "O Mercado Pago informou que o pagamento foi recusado ou cancelado. O pedido não foi confirmado."
              : isInvalid
                ? "Este link não contém os dados necessários para consultar a compra. Volte ao checkout para revisar seu pedido."
                : statusChecked
                  ? "Não recebemos a confirmação do Mercado Pago. Se você voltou antes de pagar, seu pedido não foi concluído e seu carrinho continua salvo. Se você chegou a pagar, aguarde alguns minutos antes de tentar novamente."
                  : "Seu pedido ainda não foi confirmado."}
        </p>
        {returnState !== "checking" && (
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/checkout"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 font-semibold text-white transition hover:bg-gray-800"
            >
              <FiArrowLeft aria-hidden="true" /> Revisar pedido e voltar ao
              checkout
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-200 px-5 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Continuar comprando
            </Link>
          </div>
        )}
      </section>
    </main>
  );
};

export default PaymentReturn;
