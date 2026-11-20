import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Item from "../../components/item";
import Pagination from "@/components/pagination";
import { usePagination } from "@/components/Context/paginationContext";
import { HomeProps, Product } from "@/types/ProductTypes";
import { getProductsByCategory } from "@/lib/productClient";
import Loading from "@/components/loading";
import Head from "next/head";
import Link from "next/link";
import useStoreInfo from "@/hooks/use-store-info";

const PAGE_SIZE = 8;
const PROMO_PAGE_SIZE = 50;
type ProductFilters = {
  promo: boolean;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

const DEFAULT_FILTERS: ProductFilters = {
  promo: false,
  minPrice: "",
  maxPrice: "",
  sort: "newest",
};

const hasFilters = (filters: ProductFilters) => Boolean(
  filters.promo
  || filters.minPrice
  || filters.maxPrice
  || filters.sort !== DEFAULT_FILTERS.sort,
);

const priceToCents = (value: string) => {
  if (!value.trim()) return null;

  const cleanedValue = value.trim().replace(/[^\d,.-]/g, "");
  const normalizedValue = cleanedValue.includes(",")
    ? cleanedValue.replace(/\./g, "").replace(",", ".")
    : cleanedValue;
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : null;
};

type CategoryFiltersProps = {
  filters: ProductFilters;
  hasActiveFilters: boolean;
  onFiltersChange: (filters: ProductFilters) => void;
  onApply: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

const CategoryFilters = ({
  filters,
  hasActiveFilters,
  onFiltersChange,
  onApply,
  onClear,
}: CategoryFiltersProps) => {
  const updateFilters = (changes: Partial<ProductFilters>) => {
    onFiltersChange({ ...filters, ...changes });
  };

  return (
    <form
      className="mb-6 rounded-xl border border-gray-200 bg-white p-4"
      onSubmit={onApply}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-gray-700">
          Preço mínimo
          <input
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={filters.minPrice}
            onChange={(event) => updateFilters({ minPrice: event.target.value })}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Preço máximo
          <input
            inputMode="decimal"
            placeholder="Sem limite"
            value={filters.maxPrice}
            onChange={(event) => updateFilters({ maxPrice: event.target.value })}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Ordenar por
          <select
            value={filters.sort}
            onChange={(event) => updateFilters({ sort: event.target.value })}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="newest">Mais recentes</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="name">Nome</option>
          </select>
        </label>

        <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={filters.promo}
            onChange={(event) => updateFilters({ promo: event.target.checked })}
            className="h-4 w-4 accent-gray-950"
          />
          Em promoção
        </label>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
        {hasActiveFilters && (
          <button
            className="min-h-11 rounded-lg px-4 text-sm font-medium text-gray-700 hover:bg-gray-100"
            type="button"
            onClick={onClear}
          >
            Limpar filtros
          </button>
        )}
        <button
          className="min-h-11 rounded-lg bg-gray-950 px-5 text-sm font-semibold text-white hover:bg-gray-800"
          type="submit"
        >
          Filtrar
        </button>
      </div>
    </form>
  );
};

export default function Home({ products, category, itemsCount }: HomeProps) {
  const [productList, setProductList] = useState<Product[]>(products);
  const [productListSize, setProductListSize] = useState<number>(itemsCount);
  const { currentPage, setCurrentPage } = usePagination();
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const storeInfo = useStoreInfo();
  const isPromotionsPage = category === "promo";
  const categoryInfo = storeInfo?.categories.find((item) =>
    item.path.split("/").filter(Boolean).pop()?.toLowerCase() ===
    category.toLowerCase(),
  );
  const readableCategory = category
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1))
    .join(" ");
  const pageTitle = isPromotionsPage
    ? "Ofertas"
    : categoryInfo?.name || readableCategory;
  const categoryTrail = useMemo(() => {
    const trail = [];
    let current = categoryInfo;
    while (current) {
      trail.unshift(current);
      const parentId = current.parentId;
      if (!parentId) break;
      current = storeInfo?.categories?.find((item) => item.id === parentId);
    }
    return trail;
  }, [categoryInfo, storeInfo?.categories]);

  useEffect(() => {
    setCurrentPage(0);
  }, [category, setCurrentPage]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getProductsByCategory(
        category,
        currentPage,
        undefined,
        {
          promo: appliedFilters.promo,
          minPrice: priceToCents(appliedFilters.minPrice),
          maxPrice: priceToCents(appliedFilters.maxPrice),
          sort: appliedFilters.sort,
        },
      );
      setProductList(data.content);
      setProductListSize(data.totalElements);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [category, currentPage, appliedFilters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const hasAppliedFilters = hasFilters(appliedFilters);
  const hasActiveFilters = hasFilters(filters) || hasAppliedFilters;

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(0);
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setCurrentPage(0);
  };

  const renderCategoryPage = () => (
    <main className="mx-auto mt-20 min-h-[60vh] max-w-7xl px-4 py-6 sm:px-6 md:mt-40 md:py-10 lg:px-8">
      <Head>
        <title>
          {pageTitle} | {storeInfo?.name || "Loja"}
        </title>
        <meta
          name="description"
          content={`Confira ${pageTitle.toLocaleLowerCase("pt-BR")} na loja ${
            storeInfo?.name || "online"
          }.`}
        />
      </Head>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">
          Início
        </Link>
        {categoryTrail.length > 0 ? (
          categoryTrail.map((item, index) => (
            <span key={item.id}>
              <span aria-hidden="true" className="mx-2">/</span>
              {index < categoryTrail.length - 1 ? (
                <Link href={item.path} className="hover:text-gray-900">
                  {item.name}
                </Link>
              ) : (
                <span aria-current="page">{item.name}</span>
              )}
            </span>
          ))
        ) : (
          <>
            <span aria-hidden="true" className="mx-2">/</span>
            <span aria-current="page">{pageTitle}</span>
          </>
        )}
      </nav>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
            {isPromotionsPage ? "Oportunidades" : "Explore a coleção"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {productListSize}{" "}
            {productListSize === 1
              ? "produto disponível"
              : "produtos disponíveis"}
          </p>
        </div>
      </header>
      {!isPromotionsPage && (
        <CategoryFilters
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onFiltersChange={setFilters}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      )}
      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Não foi possível carregar os produtos.</p>
          <button
            type="button"
            onClick={fetchProducts}
            className="mt-3 font-semibold underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : productListSize > 0 ? (
        <>
          <div className="grid grid-cols-2 content-start gap-3 sm:gap-5 lg:grid-cols-4">
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
            pageSize={category !== "promo" ? PAGE_SIZE : PROMO_PAGE_SIZE}
            onPageChange={(page: number) => setCurrentPage(page)}
          />
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-10 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {isPromotionsPage
              ? "Nenhuma oferta ativa no momento"
              : hasAppliedFilters
                ? "Nenhum produto com esses filtros"
                : "Ainda não há produtos nesta categoria"}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {hasAppliedFilters
              ? "Altere os filtros ou limpe para ver outros produtos."
              : "Volte em breve para conferir as novidades."}
          </p>
          {hasAppliedFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white"
            >
              Limpar filtros
            </button>
          )}
          {!hasAppliedFilters && !isPromotionsPage && (
            <Link
              href="/"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white"
            >
              Ver destaques da loja
            </Link>
          )}
        </div>
      )}
    </main>
  );

  return (
    <div className="relative">
      {loading ? (
        <Loading label={`Carregando ${pageTitle.toLocaleLowerCase("pt-BR")}...`} />
      ) : (
        renderCategoryPage()
      )}
    </div>
  );
}

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export const getStaticProps = async ({
  params,
}: {
  params: { category: string };
}) => {
  const { category } = params;
  try {
    //const data = await getProductsByCategoryNoStore(category, 0);
    return { props: { products: [], category, itemsCount: 0 } };
  } catch (err) {
    return { props: { products: [], category, itemsCount: 0 } };
  }
};
