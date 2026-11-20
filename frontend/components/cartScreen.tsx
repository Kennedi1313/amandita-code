import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowRight,
  FiAlertCircle,
  FiLoader,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiXCircle,
} from "react-icons/fi";
import { useAuth } from "@/components/Context/authContext";
import ProductPrice from "@/components/productPrice";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import useStoreInfo from "@/hooks/use-store-info";
import {
  getProductImageUrl,
  getProductsByIdForDomain,
  getProductsPaginated,
} from "@/lib/productClient";
import { hasGuestCheckoutAccess } from "@/lib/guestCheckout";
import { formatCurrency } from "@/lib/utils";
import { Product, ProductVariation } from "@/types/ProductTypes";

const priceToCents = (price: string | number) => {
  const normalized = String(price || "0")
    .replace(/\./g, "")
    .replace(",", ".");
  return Math.round(Number(normalized) * 100) || 0;
};

const CartScreen = () => {
  const router = useRouter();
  const { customer } = useAuth();
  const storeInfo = useStoreInfo();
  const { cartDetails, cartCount, addItemToCart, removeItem } =
    useShoppingCart();
  const [recommendationCandidates, setRecommendationCandidates] = useState<
    Product[]
  >([]);
  const [currentStockByCartKey, setCurrentStockByCartKey] = useState<
    Record<string, number>
  >({});
  const [checkingStock, setCheckingStock] = useState(false);

  const fetchCurrentStock = useCallback(
    async (cart: typeof cartDetails) => {
      if (!storeInfo?.domain) {
        throw new Error("Não foi possível identificar esta loja.");
      }

      const entries = Object.entries(cart);
      const stockEntries = await Promise.all(
        entries.map(async ([cartKey, item]) => {
          const productId = Number(item.productId || item.id.split(":")[0]);
          const product = await getProductsByIdForDomain(
            productId,
            storeInfo.domain,
          );
          const variation = item.variationId
            ? product.variations?.find(
                (currentVariation: ProductVariation) =>
                  currentVariation.id === item.variationId,
              )
            : undefined;
          const quantity = item.variationId
            ? Number(variation?.quantity ?? 0)
            : Number(product.quantity ?? 0);

          return [cartKey, Number.isFinite(quantity) ? quantity : 0] as const;
        }),
      );

      return Object.fromEntries(stockEntries);
    },
    [storeInfo?.domain],
  );

  useEffect(() => {
    if (!storeInfo?.domain || !Object.keys(cartDetails).length) {
      setCurrentStockByCartKey({});
      return;
    }

    let active = true;
    fetchCurrentStock(cartDetails)
      .then((stock) => {
        if (active) setCurrentStockByCartKey(stock);
      })
      .catch(() => {
        if (active) setCurrentStockByCartKey({});
      });

    return () => {
      active = false;
    };
  }, [cartDetails, fetchCurrentStock, storeInfo?.domain]);

  useEffect(() => {
    if (!storeInfo?.domain) return;

    let active = true;
    Promise.all([0, 1, 2].map((page) => getProductsPaginated(page)))
      .then((responses) => {
        if (!active) return;
        setRecommendationCandidates(
          responses.flatMap(
            (response) => response.data?.content || response.content || [],
          ),
        );
      })
      .catch(() => {
        if (active) setRecommendationCandidates([]);
      });

    return () => {
      active = false;
    };
  }, [storeInfo?.domain]);

  const recommendedProducts = useMemo(() => {
    const cartProducts = Object.values(cartDetails) as Product[];
    const cartProductIds = new Set(
      cartProducts.map(
        (product: any) => String(product.productId || product.id).split(":")[0],
      ),
    );
    const category = cartProducts
      .find((product) => product.category)
      ?.category?.toLowerCase();

    return recommendationCandidates
      .filter((product) => {
        if (cartProductIds.has(String(product.id))) return false;
        if (product.variations?.length) {
          return product.variations.some(
            (variation) => Number(variation.quantity || 0) > 0,
          );
        }
        return Number(product.quantity || 0) > 0;
      })
      .sort((first, second) => {
        const firstMatches = Number(
          Boolean(category && first.category?.toLowerCase() === category),
        );
        const secondMatches = Number(
          Boolean(category && second.category?.toLowerCase() === category),
        );
        return secondMatches - firstMatches;
      })
      .slice(0, 3);
  }, [cartDetails, recommendationCandidates]);

  const totals = useMemo(
    () =>
      Object.values(cartDetails).reduce(
        (sum, item: any) => {
          const itemPrice =
            priceToCents(item.price) * Number(item.quantity || 0);
          sum.full += itemPrice;
          sum.subtotal += Math.round(
            itemPrice * (1 - Number(item.promo || 0) / 100),
          );
          return sum;
        },
        { subtotal: 0, full: 0 },
      ),
    [cartDetails],
  );

  const continueToCheckout = async () => {
    if (checkingStock) return;

    setCheckingStock(true);
    try {
      const currentStock = await fetchCurrentStock(cartDetails);
      setCurrentStockByCartKey(currentStock);

      const unavailableItems = Object.entries(cartDetails).filter(
        ([key, item]) => currentStock[key] < Number(item.quantity || 0),
      );

      if (unavailableItems.length) {
        toast.error(
          "Remova os produtos sem estoque do carrinho para continuar."
        );
        setCheckingStock(false);
        return;
      }

      await router.push(
        customer || hasGuestCheckoutAccess()
          ? "/checkout"
          : `/login?redirect=${encodeURIComponent("/checkout")}`,
      );
    } catch {
      toast.error("Não foi possível confirmar o estoque. Tente novamente.");
    } finally {
      setCheckingStock(false);
    }
  };

  if (!storeInfo) return null;

  return (
    <main className="mx-auto mt-16 min-h-[50vh] w-full max-w-6xl px-4 py-6 sm:px-6 md:mt-28 md:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
            Seu carrinho
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {cartCount} {cartCount === 1 ? "item" : "itens"} no seu pedido
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 hover:text-black"
        >
          Continuar comprando
        </Link>
      </div>

      {cartCount === 0 ? (
        <section className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center shadow-sm sm:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <FiShoppingBag className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-gray-950">
            Seu carrinho está vazio
          </h2>
          <p className="mx-auto mt-2 max-w-md text-gray-600">
            Escolha seus produtos favoritos e volte aqui para revisar o pedido.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-gray-950 px-6 font-semibold text-white transition hover:bg-gray-800"
          >
            Ver produtos
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-5">
            <section className="flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-950">
                  Seus produtos
                </h2>
                <span className="text-sm text-gray-500">
                  {cartCount} {cartCount === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {Object.entries(cartDetails).map(
                  ([key, product]: [any, any]) => {
                    const hasCurrentStock =
                      Object.prototype.hasOwnProperty.call(
                        currentStockByCartKey,
                        key,
                      );
                    const stockQuantity = hasCurrentStock
                      ? currentStockByCartKey[key]
                      : Number(product.stockQuantity || 0);
                    const requestedQuantity = Number(product.quantity || 0);
                    const stockIsInsufficient =
                      hasCurrentStock && requestedQuantity > stockQuantity;
                    const reachedStockLimit =
                      requestedQuantity >= stockQuantity;
                    const productName =
                      product.variationLabel &&
                      product.name.endsWith(` - ${product.variationLabel}`)
                        ? product.name.slice(
                            0,
                            -(product.variationLabel.length + 3),
                          )
                        : product.name;

                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 sm:gap-4 sm:p-4"
                      >
                        <Link
                          href={`/details/${product.productId || product.id}`}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-[4.5rem] sm:w-[4.5rem]"
                          aria-label={`Ver ${productName}`}
                        >
                          <Image
                            src={getProductImageUrl(
                              product.productId || product.id,
                            )}
                            alt={productName}
                            fill
                            className="object-cover"
                            sizes="72px"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/details/${product.productId || product.id}`}
                            className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 hover:underline sm:text-base"
                          >
                            {productName}
                          </Link>
                          {product.variationLabel && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              Opção: {product.variationLabel}
                            </p>
                          )}
                          {stockIsInsufficient && (
                            <p
                              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700"
                              role="status"
                            >
                              <FiAlertCircle
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                              />
                              {stockQuantity === 0
                                ? "Esgotado"
                                : `Estoque insuficiente · ${stockQuantity} disponível${stockQuantity === 1 ? "" : "eis"}`}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <ProductPrice
                              price={product.price}
                              promo={product.promo}
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => removeItem(product)}
                                disabled={product.quantity <= 1}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Reduzir quantidade de ${productName}`}
                              >
                                <FiMinus className="h-4 w-4" />
                              </button>
                              <span className="min-w-6 text-center text-sm font-semibold">
                                {product.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => addItemToCart(product, 1)}
                                disabled={reachedStockLimit}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Aumentar quantidade de ${productName}`}
                              >
                                <FiPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(product, product.quantity)
                                }
                                className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Remover ${productName} do pedido`}
                              >
                                <FiXCircle className="h-5 w-5 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            {recommendedProducts.length > 0 && (
              <aside className="flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                    Para completar seu pedido
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-950">
                    Leve também
                  </h2>
                </div>
                <div className="flex flex-col divide-y divide-gray-100">
                  {recommendedProducts.map((product) => {
                    const availableVariations = (product.variations || [])
                      .filter(
                        (variation) => Number(variation.quantity || 0) > 0,
                      )
                      .sort(
                        (first, second) =>
                          priceToCents(first.price) -
                          priceToCents(second.price),
                      );
                    const featuredVariation = availableVariations[0];
                    const hasOptions = Boolean(product.variations?.length);
                    const displayPrice =
                      featuredVariation?.price || product.price;
                    const displayPromo =
                      featuredVariation?.promo ?? product.promo;

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`/details/${product.id}`}
                          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100"
                          aria-label={`Ver ${product.name}`}
                        >
                          <Image
                            src={getProductImageUrl(product.id)}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/details/${product.id}`}
                            className="line-clamp-2 text-sm font-medium leading-5 text-gray-800 hover:underline"
                          >
                            {product.name}
                          </Link>
                          {hasOptions && (
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              A partir de
                            </p>
                          )}
                          <ProductPrice
                            price={displayPrice}
                            promo={displayPromo}
                          />
                        </div>
                        {hasOptions ? (
                          <Link
                            href={`/details/${product.id}`}
                            aria-label={`Escolher opções de ${product.name}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:border-gray-900 hover:bg-gray-50"
                          >
                            <FiArrowRight className="h-5 w-5" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Adicionar ${product.name} ao carrinho`}
                            onClick={() => {
                              addItemToCart(
                                {
                                  ...product,
                                  id: String(product.id),
                                  quantity: 1,
                                  stockQuantity: Number(product.quantity || 0),
                                },
                                1,
                              );
                              toast.success(
                                `${product.name} adicionado ao pedido.`,
                              );
                            }}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white transition hover:bg-gray-700"
                          >
                            <FiPlus className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </aside>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-28">
            <h2 className="text-lg font-semibold text-gray-950">
              Resumo do pedido
            </h2>
            <div className="mt-4 flex items-center justify-between gap-3 border-b border-gray-100 py-3 text-sm text-gray-600">
              <span>Produtos</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-5 text-gray-500">
              Você escolhe o contato e a forma de entrega na próxima etapa.
            </p>
            <button
              type="button"
              onClick={continueToCheckout}
              disabled={checkingStock || cartCount === 0}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-70"
            >
              {checkingStock ? (
                <>
                  <FiLoader
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Conferindo estoque...
                </>
              ) : (
                <>
                  Continuar para compra <FiArrowRight aria-hidden="true" />
                </>
              )}
            </button>
            <Link
              href="/"
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center text-sm font-semibold text-gray-600 underline decoration-gray-300 underline-offset-4 hover:text-gray-950"
            >
              Continuar comprando
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
};

export default CartScreen;
