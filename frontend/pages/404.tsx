import Head from "next/head";
import Link from "next/link";
import { FiArrowLeft, FiCompass, FiHome } from "react-icons/fi";
import useStoreInfo from "@/hooks/use-store-info";

export default function NotFound() {
  const storeInfo = useStoreInfo();

  return (
    <>
      <Head>
        <title>Página não encontrada | {storeInfo?.name || "Loja online"}</title>
        <meta
          name="description"
          content="Não encontramos esta página. Volte para a loja e continue explorando."
        />
        <meta name="robots" content="noindex,follow" />
      </Head>

      <main className="flex min-h-screen items-center bg-[#fbfaf9] px-4 pb-16 pt-24 sm:px-6 md:pt-28">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1fr_0.9fr] md:gap-16">
          <section className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
              <FiCompass aria-hidden="true" className="text-base" />
              Endereço não encontrado
            </div>

            <p className="mt-7 text-7xl font-semibold leading-none tracking-[-0.08em] text-gray-300 sm:text-8xl">
              404
            </p>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-gray-950 sm:text-4xl">
              Parece que esta página saiu do caminho.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-gray-600 sm:text-lg">
              O endereço pode estar incorreto ou a página não está mais disponível.
              Vamos voltar para a loja?
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gray-950 px-6 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                <FiHome aria-hidden="true" />
                Voltar para a loja
              </Link>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                <FiArrowLeft aria-hidden="true" />
                Voltar à página anterior
              </button>
            </div>
          </section>

          <div
            aria-hidden="true"
            className="relative mx-auto hidden aspect-square w-full max-w-sm items-center justify-center md:flex"
          >
            <div className="absolute inset-5 rounded-full border border-dashed border-gray-300" />
            <div className="absolute inset-12 rounded-full bg-[#f0eeeb]" />
            <div className="relative flex h-48 w-48 rotate-[-5deg] flex-col items-center justify-center rounded-[2rem] border border-gray-200 bg-white shadow-[0_24px_60px_rgba(31,29,27,0.10)]">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Página
              </span>
              <span className="mt-1 text-6xl font-semibold tracking-[-0.08em] text-gray-900">
                404
              </span>
              <span className="mt-2 h-1 w-12 rounded-full bg-gray-200" />
            </div>
            <span className="absolute right-5 top-10 h-3 w-3 rounded-full bg-gray-900" />
            <span className="absolute bottom-12 left-4 h-2.5 w-2.5 rounded-full bg-gray-300" />
          </div>
        </div>
      </main>
    </>
  );
}
