import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Item from "../../components/item";
import Pagination from "@/components/pagination";
import Loading from "@/components/loading";
import { usePagination } from "@/components/Context/paginationContext";
import useStoreInfo from "@/hooks/use-store-info";
import { Product } from "@/types/ProductTypes";
import { getProductsByName } from "@/lib/productClient";

const PAGE_SIZE = 8;

export default function Search() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [productListSize, setProductListSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { currentPage, setCurrentPage } = usePagination();
  const router = useRouter();
  const storeInfo = useStoreInfo();
  const query = router.query.name as string;

  useEffect(() => {
    setCurrentPage(0);
  }, [query, setCurrentPage]);

  const fetchProducts = useCallback(async () => {
    if (!query) return;

    setLoading(true);
    setLoadError(false);
    try {
      const data = await getProductsByName(query, currentPage);
      setProductList(data.content);
      setProductListSize(data.totalElements);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentPage, query]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const pageTitle = `Busca por “${query || "produtos"}”`;

  const renderEmptyState = () => (
    <main className="mx-auto mt-20 flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-10 sm:px-6 md:mt-28 lg:px-8">
      <Head>
        <title>{pageTitle} | {storeInfo?.name || "Loja"}</title>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-950">
          {loadError
            ? "Não foi possível carregar a busca"
            : "Não encontramos esse produto"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {loadError
            ? "Confira sua conexão e tente novamente."
            : `Não encontramos resultados para “${query}”. Tente outro termo ou explore os destaques da loja.`}
        </p>
        {loadError ? (
          <button
            type="button"
            onClick={fetchProducts}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Tentar novamente
          </button>
        ) : (
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Ver destaques da loja
          </Link>
        )}
      </div>
    </main>
  );

  if (loading) {
    return (
      <>
        <Head>
          <title>Buscando produtos | {storeInfo?.name || "Loja"}</title>
          <meta name="robots" content="noindex,follow" />
        </Head>
        <Loading label="Buscando produtos..." />
      </>
    );
  }

  if (loadError || productListSize === 0) {
    return renderEmptyState();
  }

  return (
    <main className="mx-auto mt-20 min-h-[60vh] max-w-7xl px-4 py-6 sm:px-6 md:mt-28 md:py-10 lg:px-8">
      <Head>
        <title>{pageTitle} | {storeInfo?.name || "Loja"}</title>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <header className="mb-7">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
          Busca na loja
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          Resultados para “{query}”
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {productListSize} {productListSize === 1
            ? "produto encontrado"
            : "produtos encontrados"}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {productList.map((item) => (
          <Item
            key={item.id}
            id={item.id}
            name={item.name}
            price={item.price}
            description={item.description}
            quantity={item.quantity}
            promo={item.promo}
            profileImageId={item.profileImageId}
            variations={item.variations}
          />
        ))}
      </div>
      <Pagination
        className="pagination-bar"
        currentPage={currentPage}
        totalCount={productListSize}
        pageSize={PAGE_SIZE}
        onPageChange={(page: number) => setCurrentPage(page)}
      />
    </main>
  );
}
