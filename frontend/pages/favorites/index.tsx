import Link from "next/link";
import Image from "next/image";
import { useShoppingFavorites } from "@/hooks/use-shopping-favorites";
import { getProductImageUrl } from "@/lib/productClient";
import ProductPrice from "@/components/productPrice";
import { FiArrowLeft, FiHeart, FiShoppingBag, FiTrash2 } from "react-icons/fi";

type FavoriteItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: number;
  profileImageId: string;
  promo: number;
  variations?: {
    id: number;
    price: string;
    quantity: string;
    promo: number;
  }[];
};

const getVariationPriceText = (item: FavoriteItem) => {
  if (!item.variations?.length) return "";

  const prices = item.variations
    .map((variation) =>
      Number(String(variation.price || "").replace(".", "").replace(",", ".")),
    )
    .filter((price) => price > 0);

  if (!prices.length) return "";

  const min = Math.min(...prices).toFixed(2).replace(".", ",");
  const max = Math.max(...prices).toFixed(2).replace(".", ",");
  return `R$ ${min} - R$ ${max}`;
};

const getTotalQuantity = (item: FavoriteItem) =>
  item.variations?.length
    ? item.variations.reduce(
        (total, variation) => total + Number(variation.quantity || 0),
        0,
      )
    : Number(item.quantity || 0);

export default function Favorites() {
  const { favoritesDetails, favoritesCount, clearFavorites, removeItem } =
    useShoppingFavorites();
  const items = Object.values(favoritesDetails || {}) as FavoriteItem[];

  return (
    <main className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[70vh]">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-950">
            Favoritos
          </h1>
          <p className="mt-2 text-base md:text-lg text-gray-600">
            {favoritesCount > 0
              ? `${favoritesCount} ${
                  favoritesCount === 1 ? "produto salvo" : "produtos salvos"
                } para ver depois.`
              : "Salve produtos para comparar e voltar neles com calma."}
          </p>
        </div>

        {favoritesCount > 0 && (
          <button
            onClick={clearFavorites}
            className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Limpar favoritos
          </button>
        )}
      </div>

      {favoritesCount === 0 ? (
        <section className="rounded-md border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <FiHeart className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-gray-950">
            Nenhum favorito ainda
          </h2>
          <p className="mx-auto mt-2 max-w-md text-gray-600">
            Toque no coração dos produtos que você gostou para montar sua lista.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-black-1000 px-5 font-semibold text-white transition hover:opacity-90"
          >
            Ver produtos
          </Link>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const totalQuantity = getTotalQuantity(item);
            const hasStock = totalQuantity > 0;
            const variationPriceText = getVariationPriceText(item);

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-md border border-gray-100 bg-white shadow-sm transition hover:border-gray-200 hover:shadow-md"
              >
                <div className="flex gap-4 p-3">
                  <Link
                    href={`/details/${item.id}`}
                    className="relative h-32 w-28 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-36 sm:w-32"
                  >
                    <Image
                      src={getProductImageUrl(item.id)}
                      alt={item.name}
                      fill
                      quality={70}
                      className="object-cover"
                      sizes="128px"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/details/${item.id}`} className="min-w-0">
                        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-gray-950">
                          {item.name}
                        </h2>
                      </Link>
                      <button
                        onClick={() => removeItem(item)}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remover ${item.name} dos favoritos`}
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-2 text-lg font-semibold text-gray-950">
                      {variationPriceText ? (
                        <span>{variationPriceText}</span>
                      ) : (
                        <ProductPrice price={item.price} promo={item.promo} />
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          hasStock
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {hasStock ? "Disponível" : "Indisponível"}
                      </span>
                      {item.variations?.length ? (
                        <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
                          {item.variations.length} variações
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {favoritesCount > 0 && (
        <Link
          href="/"
          className="mt-8 inline-flex items-center text-sm font-semibold text-gray-600 transition hover:text-gray-950"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Continuar comprando
        </Link>
      )}
    </main>
  );
}
