import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiCheckCircle, FiPackage, FiShoppingBag } from "react-icons/fi";
import { useShoppingCart } from "@/hooks/use-shopping-cart";

const Success = () => {
  const router = useRouter();
  const { clearCart } = useShoppingCart();

  useEffect(() => {
    clearCart();
  }, [clearCart, router]);

  return (
    <main className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[70vh]">
      <section className="rounded-md border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <FiCheckCircle className="h-7 w-7" />
        </div>
        <p className="mt-5 text-sm uppercase tracking-wide text-green-700">
          Tudo certo
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold text-gray-950">
          Pedido confirmado
        </h1>
        <p className="mx-auto mt-2 max-w-md text-gray-600">
          Recebemos seu pedido com sucesso. Você já pode acompanhar tudo em
          Minhas compras.
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
