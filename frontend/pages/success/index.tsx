import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiAlertCircle, FiCheckCircle, FiPackage, FiShoppingBag } from "react-icons/fi";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import { getMercadoPagoSaleStatus } from "@/lib/client";

const Success = () => {
  const router = useRouter();
  const { clearCart } = useShoppingCart();
  const [saleStatus, setSaleStatus] = useState("PENDENTE");
  const isMercadoPago = router.query.provider === "mercadopago";
  const saleId = Array.isArray(router.query.saleId) ? router.query.saleId[0] : router.query.saleId;

  useEffect(() => {
    clearCart();
  }, [clearCart, router]);

  useEffect(() => {
    if (!router.isReady || !isMercadoPago || !saleId) return;
    let cancelled = false;
    const checkStatus = async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        try {
          const response = await getMercadoPagoSaleStatus(saleId);
          const status = String(response.data?.status || "PENDENTE").toUpperCase();
          if (!cancelled) setSaleStatus(status);
          if (["APROVADO", "RECUSADO", "CANCELADO"].includes(status)) return;
        } catch {
          if (!cancelled) setSaleStatus("PENDENTE");
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };
    checkStatus();
    return () => { cancelled = true; };
  }, [router.isReady, isMercadoPago, saleId]);

  const paymentApproved = !isMercadoPago || saleStatus === "APROVADO";
  const paymentRejected = saleStatus === "RECUSADO" || saleStatus === "CANCELADO";

  return (
    <main className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[70vh]">
      <section className="rounded-md border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${paymentRejected ? "bg-red-50 text-red-600" : paymentApproved ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
          {paymentRejected ? <FiAlertCircle className="h-7 w-7" /> : paymentApproved ? <FiCheckCircle className="h-7 w-7" /> : <FiAlertCircle className="h-7 w-7" />}
        </div>
        <p className={`mt-5 text-sm uppercase tracking-wide ${paymentRejected ? "text-red-700" : paymentApproved ? "text-green-700" : "text-amber-700"}`}>
          {paymentRejected ? "Pagamento não aprovado" : paymentApproved ? "Tudo certo" : "Aguardando confirmação"}
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold text-gray-950">
          {paymentRejected ? "Não foi possível confirmar o pagamento" : paymentApproved ? "Pedido confirmado" : "Estamos confirmando seu pagamento"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-gray-600">
          {paymentRejected
            ? "O pedido permanece registrado, mas o pagamento não foi aprovado. Você pode tentar novamente ou falar com a loja."
            : paymentApproved
              ? "Recebemos seu pedido com sucesso. Você já pode acompanhar tudo em Minhas compras."
              : "Estamos confirmando seu pagamento. Você pode acompanhar o pedido em Minhas compras."}
        </p>

        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 text-left md:grid-cols-2">
          <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
            <FiPackage className="text-xl text-black-1000" />
            <p className="mt-2 font-semibold text-gray-950">Próximo passo</p>
            <p className="mt-1 text-sm text-gray-600">
              A loja vai acompanhar o pagamento e preparar seu pedido.
            </p>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
            <FiShoppingBag className="text-xl text-black-1000" />
            <p className="mt-2 font-semibold text-gray-950">Acompanhe</p>
            <p className="mt-1 text-sm text-gray-600">
              Status, produtos e detalhes ficam salvos no histórico.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/sales"
            className="inline-flex h-11 items-center justify-center rounded-md bg-black-1000 px-5 font-semibold text-white transition hover:opacity-90"
          >
            Ver minhas compras
          </Link>
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
