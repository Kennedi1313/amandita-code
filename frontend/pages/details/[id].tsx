import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useShoppingFavorites } from "@/hooks/use-shopping-favorites";
import { BsFillHeartFill, BsHeart, BsWhatsapp } from "react-icons/bs";
import Head from "next/head";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import {
  getProductsByIdForDomain,
  getProductsByCategory,
  getProductImageUrl,
} from "@/lib/productClient";
import { Product } from "@/types/ProductTypes";
import Image from "next/image";
import useStoreInfo from "@/hooks/use-store-info";
import { FiHeart, FiMaximize2, FiShoppingCart, FiX } from "react-icons/fi";
import ProductPrice from "@/components/productPrice";
import Item from "@/components/item";
import {
  getLocalDeliveryQuote,
  getMelhorEnvioQuote,
  getProductReviews,
} from "@/lib/client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Mousewheel, Keyboard } from "swiper/modules";

type ShippingQuote = {
  id: string;
  name: string;
  price: string;
  eta?: string;
};

export default function Details(props: Product) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [zoomImageId, setZoomImageId] = useState<string | null>(null);
  const [shippingZip, setShippingZip] = useState("");
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [productReviews, setProductReviews] = useState<any[]>([]);
  useEffect(() => {
    if (!props.category) return;
    getProductsByCategory(props.category, 0)
      .then((response) => {
        const recommendations = (response.content || [])
          .filter((product: Product) => String(product.id) !== String(props.id))
          .slice(0, 4);
        setRelatedProducts(recommendations);
      })
      .catch(() => setRelatedProducts([]));
  }, [props.category, props.id]);
  useEffect(() => {
    getProductReviews(Number(props.id))
      .then((response) => setProductReviews(response.data || []))
      .catch(() => setProductReviews([]));
  }, [props.id]);
  const variations = [...(props.variations || [])].sort((first, second) => {
    const firstLabel = Object.values(first.options || {}).join(" / ");
    const secondLabel = Object.values(second.options || {}).join(" / ");
    return firstLabel.localeCompare(secondLabel, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    });
  });
  const hasVariations = variations.length > 0;
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(
    hasVariations
      ? (variations.find((variation) => Number(variation.quantity || 0) > 0)
          ?.id ??
          variations[0]?.id ??
          null)
      : null,
  );
  const selectedVariation = variations.find(
    (variation) => variation.id === selectedVariationId,
  );
  const selectedVariationLabel = selectedVariation
    ? Object.values(selectedVariation.options || {}).join(" / ")
    : "";
  const visibleQuantity = hasVariations
    ? Number(selectedVariation?.quantity || 0)
    : props.quantity;
  const visiblePrice = selectedVariation?.price || props.price;
  const visiblePromo =
    selectedVariation?.promo !== undefined
      ? selectedVariation.promo
      : props.promo;
  const router = useRouter();
  const {
    addItemToFavorites,
    favoritesDetails,
    removeItem: removeItemFavorites,
  } = useShoppingFavorites();
  const {
    addItemToCart,
    cartDetails,
    removeItem: removeItemCart,
  } = useShoppingCart();
  const cartKey = hasVariations
    ? `${props.id}:${selectedVariation?.id}`
    : String(props.id);
  const currentCartQuantity = Number(cartDetails?.[cartKey]?.quantity || 0);
  const hasStock = Number(visibleQuantity || 0) > 0;
  const averageRating = productReviews.length
    ? productReviews.reduce(
        (total, review) => total + Number(review.rating || 0),
        0,
      ) / productReviews.length
    : 0;
  const reachedStockLimit =
    hasStock && currentCartQuantity >= Number(visibleQuantity || 0);
  const toastId = useRef<string>("");

  useEffect(() => {
    if (!zoomImageId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomImageId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [zoomImageId]);

  const handleOnAddToCart = () => {
    if (hasVariations && !selectedVariation) {
      toast.error("Escolha uma opção antes de adicionar ao carrinho.");
      return;
    }

    if (!hasStock) {
      toast.error("Essa opção está indisponível no momento.");
      return;
    }

    if (reachedStockLimit) {
      toast.error("Você já adicionou todo o estoque disponível ao carrinho.");
      return;
    }

    addItemToCart({
      ...props,
      id: hasVariations ? `${props.id}:${selectedVariation?.id}` : props.id,
      productId: props.id,
      variationId: selectedVariation?.id,
      variationLabel: selectedVariationLabel,
      name: hasVariations
        ? `${props.name} - ${selectedVariationLabel}`
        : props.name,
      price: visiblePrice,
      promo: visiblePromo,
      quantity: 1,
      stockQuantity: Number(visibleQuantity || 0),
    });
    toast.success(`${props.name} adicionado (a) ao seu carrinho!`, {
      id: toastId.current,
    });
  };

  const handleOnAddToFavorites = () => {
    addItemToFavorites(props);
    toast.success(`${props.name} adicionado (a) aos favoritos!`, {
      id: toastId.current,
    });
  };

  const isInFavorites = () => {
    if (favoritesDetails) {
      return Object.keys(favoritesDetails).includes(String(props.id));
    } else {
      return false;
    }
  };

  const getContrastingColor = (hexColor: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor || "")) return "#1F1D1B";
    const channels = [1, 3, 5].map((offset) => {
      const value = parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance =
      0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    return luminance > 0.179 ? "#000000" : "#FFFFFF";
  };

  const isInCart = () => {
    if (cartDetails) {
      return Object.keys(cartDetails).includes(cartKey);
    } else {
      return false;
    }
  };

  const storeInfo = useStoreInfo();
  if (!storeInfo) return null;

  const configuredHeaderBackgroundColor =
    storeInfo?.headerBackgroundColor || "";
  const headerBackgroundColor = /^#[0-9A-Fa-f]{6}$/.test(
    configuredHeaderBackgroundColor,
  )
    ? configuredHeaderBackgroundColor
    : "#FFFFFF";
  const headerForegroundColor = getContrastingColor(headerBackgroundColor);
  const productCategory = (storeInfo.categories ?? []).find((category) => {
    const categorySlug = category.path.split("/").filter(Boolean).pop();
    return (
      categorySlug?.toLocaleLowerCase("pt-BR") ===
        String(props.category || "").toLocaleLowerCase("pt-BR") ||
      category.name.toLocaleLowerCase("pt-BR") ===
        String(props.category || "").toLocaleLowerCase("pt-BR")
    );
  });
  const categoryTrail = (() => {
    const trail = [];
    let current = productCategory;
    while (current) {
      trail.unshift(current);
      const parentId = current.parentId;
      if (!parentId) break;
      current = storeInfo.categories?.find((item) => item.id === parentId);
    }
    return trail;
  })();
  const whatsappDigits = String(storeInfo.whatsapp || "").replace(/\D/g, "");
  const storeWhatsapp = whatsappDigits.startsWith("55")
    ? whatsappDigits
    : `55${whatsappDigits}`;
  const productUrl = `https://${storeInfo.domain}/details/${props.id}`;
  const stockMessage = encodeURIComponent(
    `Olá, tudo bem? Gostaria de ser avisado quando este produto chegar em estoque: ${props.name} - ${productUrl}`,
  );
  const imageIds = (
    props.imagesIds?.length ? props.imagesIds : [props.profileImageId]
  ).filter(Boolean);
  const hasConfiguredPickup = Boolean(
    storeInfo.pickupEnabled &&
    storeInfo.pickupAddress?.zip?.trim() &&
    storeInfo.pickupAddress?.street?.trim() &&
    storeInfo.pickupAddress?.number?.trim() &&
    storeInfo.pickupAddress?.district?.trim() &&
    storeInfo.pickupAddress?.city?.trim() &&
    storeInfo.pickupAddress?.state?.trim(),
  );
  const hasConfiguredLocalDelivery = Boolean(
    storeInfo.localDeliveryEnabled &&
    storeInfo.shippingOriginZip?.replace(/\D/g, "").length === 8 &&
    storeInfo.deliveryDistanceRanges?.length,
  );
  const localDeliveryEta = String(storeInfo.localDeliveryEta || "").trim();
  const localDeliveryEtaLabel = /^\d+(?:[,.]\d+)?$/.test(localDeliveryEta)
    ? `${localDeliveryEta} dias úteis`
    : localDeliveryEta;
  const hasConfiguredMelhorEnvio = Boolean(
    storeInfo.melhorEnvioConfigured &&
    (
      storeInfo.melhorEnvioOriginZip ||
      storeInfo.melhorEnvioOriginAddress?.zip ||
      ""
    ).replace(/\D/g, "").length === 8,
  );
  const quoteShipping = async () => {
    const zip = shippingZip.replace(/\D/g, "");
    if (zip.length !== 8) {
      setShippingError("Digite um CEP válido com 8 números.");
      setShippingQuotes([]);
      return;
    }
    setShippingLoading(true);
    setShippingError("");
    setShippingQuotes([]);
    const results: ShippingQuote[] = [];
    try {
      if (hasConfiguredLocalDelivery) {
        const listedPriceInCents =
          Number(String(visiblePrice || "0").replace(/\D/g, "")) || 0;
        const subtotalInCents = Math.round(
          (listedPriceInCents * (100 - Number(visiblePromo || 0))) / 100,
        );
        const response = await getLocalDeliveryQuote(zip, subtotalInCents);
        if (response.data?.available) {
          const fee = Number(response.data.fee || 0) / 100;
          results.push({
            id: "local-delivery",
            name: "Entrega local",
            price:
              fee === 0
                ? "Grátis"
                : new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(fee),
            eta: localDeliveryEtaLabel || undefined,
          });
        }
      }
      if (hasConfiguredMelhorEnvio) {
        const response = await getMelhorEnvioQuote({
          destinationZip: zip,
          items: [
            {
              productId: Number(props.id),
              variationId: selectedVariationId,
              quantity: 1,
            },
          ],
        });
        const body =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        (Array.isArray(body) ? body : [])
          .filter((quote: any) => !quote.error)
          .forEach((quote: any, index: number) => {
            const fee = Number(quote.price ?? quote.custom_price ?? 0);
            const formatted = new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(fee);
            results.push({
              id: `melhor-envio-${quote.id ?? index}`,
              name: quote.name || quote.company?.name || "Melhor Envio",
              price: formatted,
              eta: quote.delivery_time
                ? `Até ${quote.delivery_time} dias úteis`
                : undefined,
            });
          });
      }
      setShippingQuotes(results);
      if (!results.length)
        setShippingError("Não encontramos opções de entrega para esse CEP.");
    } catch {
      setShippingError(
        "Não foi possível consultar o frete agora. Tente novamente ou confira no checkout.",
      );
    } finally {
      setShippingLoading(false);
    }
  };

  return router.isFallback ? (
    <>
      <Head>
        <title>Carregando produto | {storeInfo.name}</title>
      </Head>
      <p className="text-center text-lg py-12">Carregando produto…</p>
    </>
  ) : (
    <>
      <Head>
        <title>
          {props.name} | {storeInfo.name}
        </title>
        <meta
          name="description"
          content={`${props.name}: ${String(props.description || "Confira detalhes e compre online.").slice(0, 150)}`}
        />
        <link rel="canonical" href={productUrl} />
        <meta property="og:type" content="product" />
        <meta
          property="og:title"
          content={`${props.name} | ${storeInfo.name}`}
        />
        <meta
          property="og:description"
          content={String(props.description || "Confira este produto.").slice(
            0,
            200,
          )}
        />
        <meta property="og:url" content={productUrl} />
        {imageIds[0] ? (
          <meta
            property="og:image"
            content={getProductImageUrl(props.id, imageIds[0])}
          />
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: props.name,
              description: props.description,
              image: imageIds.map((imageId) =>
                getProductImageUrl(props.id, imageId),
              ),
              url: productUrl,
              brand: { "@type": "Brand", name: storeInfo.name },
              offers: {
                "@type": "Offer",
                url: productUrl,
                priceCurrency: "BRL",
                price: (
                  Number(String(visiblePrice).replace(/\D/g, "")) / 100
                ).toFixed(2),
                availability: hasStock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              },
            }),
          }}
        />
      </Head>
      <div className="mx-auto mt-20 max-w-7xl px-4 pb-28 md:mt-40 md:px-8 md:pb-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">
            Início
          </Link>
          {categoryTrail.map((category) => (
            <span key={category.id}>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <Link href={category.path} className="hover:text-gray-900">
                {category.name}
              </Link>
            </span>
          ))}
          {!categoryTrail.length && props.category && (
            <>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span>{props.category}</span>
            </>
          )}
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span aria-current="page">{props.name}</span>
        </nav>
        <div className="grid items-start gap-8 pt-2 md:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] md:gap-12 md:pt-8">
          <div className="relative aspect-[4/5] max-h-[780px] w-full overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-200">
            {imageIds.length > 0 ? (
              <Swiper
                style={
                  {
                    "--swiper-navigation-color": "#fff",
                    "--swiper-pagination-color": "#fff",
                  } as React.CSSProperties
                }
                cssMode={true}
                navigation={imageIds.length > 1}
                pagination={{ clickable: true }}
                mousewheel={true}
                keyboard={true}
                modules={[Navigation, Pagination, Mousewheel, Keyboard]}
                className="w-full h-full"
              >
                {imageIds.map((img, i) => (
                  <SwiperSlide key={img || i}>
                    <button
                      type="button"
                      onClick={() => setZoomImageId(img)}
                      aria-label={`Ampliar foto ${i + 1} de ${props.name}`}
                      className="group relative h-full w-full cursor-zoom-in"
                    >
                      <Image
                        src={getProductImageUrl(props.id, img)}
                        alt={props.name}
                        width={768}
                        height={640}
                        priority={i === 0}
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs font-semibold text-white opacity-100 transition group-hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100">
                        <FiMaximize2 aria-hidden="true" /> Ampliar foto
                      </span>
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                Produto sem imagem
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:sticky md:top-36 md:p-7">
            {!hasStock ? (
              <span className="inline-flex w-fit max-w-full items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 sm:text-sm">
                Esgotado
              </span>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
              {props.name}
            </h1>
            {hasVariations && selectedVariation && (
              <div className="mt-1">
                <ProductPrice price={visiblePrice} promo={visiblePromo} />
              </div>
            )}
            {currentCartQuantity > 0 && (
              <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                {currentCartQuantity}{" "}
                {currentCartQuantity === 1 ? "unidade" : "unidades"} no
                carrinho.
              </p>
            )}
            {!hasVariations && (
              <div className="mt-4 border-t pt-4">
                <p className="text-gray-500">Preço:</p>
                <ProductPrice
                  price={visiblePrice}
                  promo={visiblePromo}
                ></ProductPrice>
              </div>
            )}
            {hasVariations && (
              <div className="mt-3 border-t border-gray-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-gray-900">
                  Escolha uma opção
                </p>
                <div className="flex flex-col gap-2">
                  {variations.map((variation) => {
                    const label = Object.values(variation.options || {}).join(
                      " / ",
                    );
                    const quantity = Number(variation.quantity || 0);
                    const selected = selectedVariationId === variation.id;
                    return (
                      <button
                        key={variation.id}
                        type="button"
                        disabled={quantity <= 0}
                        onClick={() => setSelectedVariationId(variation.id)}
                        className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? "border-gray-950 bg-gray-50 ring-1 ring-gray-950"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {quantity > 0
                            ? `${quantity} em estoque`
                            : "Indisponível"}
                        </span>
                        <div className="mt-1 text-sm font-semibold">
                          <ProductPrice
                            price={variation.price}
                            promo={variation.promo}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 border-t pt-4">
              <p className="text-gray-500">Descrição:</p>
              <p className="whitespace-pre-line">{props.description}</p>
            </div>
            {(hasConfiguredPickup ||
              hasConfiguredMelhorEnvio ||
              storeInfo.mercadoPagoConfigured) && (
              <section
                className="mt-4 border-t pt-4"
                aria-label="Informações de compra"
              >
                <h2 className="text-sm font-semibold text-gray-900">
                  Informações de compra
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  {hasConfiguredPickup && (
                    <li>Retirada disponível no endereço da loja.</li>
                  )}
                  {hasConfiguredMelhorEnvio && (
                    <li>Consulte o Melhor Envio pelo seu CEP.</li>
                  )}
                  {storeInfo.mercadoPagoConfigured && (
                    <li>Pagamento online disponível pelo Mercado Pago.</li>
                  )}
                </ul>
              </section>
            )}
            {(hasConfiguredLocalDelivery || hasConfiguredMelhorEnvio) && (
              <section
                className="mt-4 border-t pt-4"
                aria-label="Calcular frete"
              >
                <div>
                  <label
                    htmlFor="product-shipping-zip"
                    className="text-sm font-medium text-gray-800"
                  >
                    Calcular entrega pelo CEP
                  </label>
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void quoteShipping();
                    }}
                  >
                    <input
                      id="product-shipping-zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={9}
                      value={shippingZip}
                      onChange={(event) =>
                        setShippingZip(
                          event.target.value.replace(/[^\d-]/g, "").slice(0, 9),
                        )
                      }
                      placeholder="00000-000"
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-gray-900 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={shippingLoading}
                      className="min-h-11 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {shippingLoading ? "Consultando…" : "Calcular"}
                    </button>
                  </form>
                  {shippingError && (
                    <p role="status" className="mt-2 text-sm text-amber-800">
                      {shippingError}
                    </p>
                  )}
                  {shippingQuotes.length > 0 && (
                    <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm text-gray-700">
                      {shippingQuotes.map((quote) => (
                        <li
                          key={quote.id}
                          className="flex items-center justify-between gap-4 px-3 py-3 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <span className="font-medium">{quote.name}</span>
                          <span className="shrink-0 text-right">
                            <span className="block font-semibold text-gray-900">
                              {quote.price}
                            </span>
                            {quote.eta && (
                              <span className="mt-0.5 block text-xs text-gray-500">
                                {quote.eta}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
            <div className="fixed inset-x-0 bottom-0 z-40 mt-0 flex w-full items-stretch gap-2 border-t border-gray-200 bg-white/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:gap-3 md:static md:mt-4 md:max-w-md md:rounded-md md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
              {!hasStock ? (
                <a
                  href={
                    storeWhatsapp
                      ? `https://api.whatsapp.com/send?phone=${storeWhatsapp}&text=${stockMessage}`
                      : "#"
                  }
                  target="_blank"
                  aria-disabled={!storeWhatsapp}
                  aria-label={`Avise-me no WhatsApp quando ${props.name} voltar ao estoque`}
                  className="mt-2 inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-green-whatsapp px-3 py-2 text-center text-xs font-semibold leading-tight text-white transition hover:brightness-95 aria-disabled:pointer-events-none aria-disabled:opacity-50 sm:text-sm"
                >
                  <BsWhatsapp className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <span className="sm:hidden">Avise-me quando voltar</span>
                  <span className="hidden sm:inline">
                    Me avise quando chegar
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  style={{
                    backgroundColor: headerBackgroundColor,
                    color: headerForegroundColor,
                  }}
                  className="mt-2 inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-black p-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={reachedStockLimit && !isInCart()}
                  onClick={() => {
                    isInCart()
                      ? removeItemCart({
                          ...props,
                          id: hasVariations
                            ? `${props.id}:${selectedVariation?.id}`
                            : props.id,
                        })
                      : handleOnAddToCart();
                  }}
                >
                  {isInCart() ? (
                    <>
                      {" "}
                      <FiShoppingCart className="w-5 h-5 text-white"></FiShoppingCart>{" "}
                      Remover do carrinho{" "}
                    </>
                  ) : (
                    <>
                      <FiShoppingCart className="w-5 h-5 opacity-100 text-white"></FiShoppingCart>{" "}
                      {reachedStockLimit
                        ? "Estoque no carrinho"
                        : "Adicionar ao carrinho"}{" "}
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                aria-label={`${isInFavorites() ? "Remover dos" : "Adicionar aos"} favoritos: ${props.name}`}
                aria-pressed={isInFavorites()}
                className="mt-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-300 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                onClick={() => {
                  isInFavorites()
                    ? removeItemFavorites(props)
                    : handleOnAddToFavorites();
                }}
              >
                {isInFavorites() ? (
                  <BsFillHeartFill className="h-5 w-5 text-rose-400" />
                ) : (
                  <BsHeart className="h-5 w-5 text-rose-400" />
                )}
              </button>
            </div>
          </div>
        </div>
        <section
          className="mx-auto mt-10 max-w-5xl border-t border-gray-200 px-2 py-8"
          aria-labelledby="product-reviews-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="product-reviews-heading"
                className="text-xl font-semibold text-gray-950"
              >
                Avaliações de clientes
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Opiniões de clientes que receberam este produto.
              </p>
            </div>
            {productReviews.length > 0 && (
              <p className="text-sm font-medium text-gray-800">
                <span className="text-amber-600">
                  ★ {averageRating.toFixed(1)}
                </span>{" "}
                · {productReviews.length}{" "}
                {productReviews.length === 1 ? "avaliação" : "avaliações"}
              </p>
            )}
          </div>
          {productReviews.length ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {productReviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{review.reviewerName}</strong>
                    <span
                      aria-label={`${review.rating} de 5 estrelas`}
                      className="text-sm text-amber-600"
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  {review.title && (
                    <p className="mt-2 font-medium text-gray-900">
                      {review.title}
                    </p>
                  )}
                  {review.comment && (
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-600">
                      {review.comment}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-gray-500">
                    Compra verificada
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
              Este produto ainda não recebeu avaliações.
            </p>
          )}
        </section>
      </div>
      {zoomImageId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada: ${props.name}`}
          onClick={() => setZoomImageId(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImageId(null)}
            aria-label="Fechar foto ampliada"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <FiX className="h-6 w-6" />
          </button>
          <Image
            src={getProductImageUrl(props.id, zoomImageId)}
            alt={props.name}
            width={1600}
            height={1600}
            priority
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
          />
        </div>
      )}
      {relatedProducts.length > 0 && (
        <section
          className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8"
          aria-labelledby="related-products-title"
        >
          <div className="mb-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
              Complete sua escolha
            </p>
            <h2
              id="related-products-title"
              className="text-2xl font-semibold tracking-tight text-gray-950"
            >
              Você também pode gostar
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <Item
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                quantity={item.quantity}
                description={item.description}
                promo={item.promo}
                profileImageId={item.profileImageId}
                variations={item.variations}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export async function getServerSideProps({ params, req }: any) {
  try {
    const host = String(req?.headers?.host || "")
      .split(":")[0]
      .toLowerCase();
    const data = await getProductsByIdForDomain(params.id, host);
    return { props: data };
  } catch (error) {
    return { notFound: true };
  }
}
