import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useShoppingFavorites } from "@/hooks/use-shopping-favorites";
import {
  BsWhatsapp,
} from "react-icons/bs";
import Head from "next/head";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import {
  getProductsByIdForDomain,
  getProductImageUrl,
} from "@/lib/productClient";
import { Product } from "@/types/ProductTypes";
import Image from "next/image";
import useStoreInfo from "@/hooks/use-store-info";
import { FiHeart, FiShoppingCart } from "react-icons/fi";
import ProductPrice from "@/components/productPrice";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Mousewheel, Keyboard } from "swiper/modules";

export default function Details(props: Product) {
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
      ? variations.find((variation) => Number(variation.quantity || 0) > 0)
          ?.id ??
          variations[0]?.id ??
          null
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
    selectedVariation?.promo !== undefined ? selectedVariation.promo : props.promo;
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
  const reachedStockLimit =
    hasStock && currentCartQuantity >= Number(visibleQuantity || 0);
  const toastId = useRef<string>("");

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

  const isInCart = () => {
    if (cartDetails) {
      return Object.keys(cartDetails).includes(cartKey);
    } else {
      return false;
    }
  };

  const storeInfo = useStoreInfo();
  if (!storeInfo) return null;
  const storeWhatsapp = String(storeInfo.whatsapp || "").replace(/\D/g, "");
  const productUrl = `https://${storeInfo.domain}/details/${props.id}`;
  const stockMessage = encodeURIComponent(
    `Olá, tudo bem? Gostaria de ser avisado quando este produto chegar em estoque: ${props.name} - ${productUrl}`,
  );
  const imageIds = (props.imagesIds?.length
    ? props.imagesIds
    : [props.profileImageId]
  ).filter(Boolean);

  return router.isFallback ? (
    <>
      <Head>
        <title>Loading...</title>
      </Head>
      <p className="text-center text-lg py-12">Loading...</p>
    </>
  ) : (
    <div className="md:container md:max-w-screen-lg mx-auto p-2 mt-20 md:mt-[8.5rem] md:px-8 h-full">
      <div
        className="flex flex-col md:flex-row justify-between items-center space-y-8 container pt-2 
                    md:pt-12 md:space-y-0 md:space-x-12 h-full"
      >
        <div className="relative w-full h-[28rem] md:h-[40rem] overflow-hidden rounded-md bg-gray-100">
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
                    <Image
                      src={getProductImageUrl(props.id, img)}
                      alt={props.name}
                      width={768}
                      height={640}
                      priority={i === 0}
                      className="w-full h-full object-cover"
                    />
                  </SwiperSlide>
                ))}
            </Swiper>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Produto sem imagem
            </div>
          )}
        </div>

        <div className="flex flex-col max-w-md w-full rounded-md gap-2">
          {!hasStock ? (
            <span className="text-xl font-semibold rounded-lg bg-red-600 py-2 px-4 text-white w-fit">
              Produto Indisponível
            </span>
          ) : null}
          <p className="text-2xl font-semibold">{props.name}</p>
          {currentCartQuantity > 0 && (
            <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {currentCartQuantity} {currentCartQuantity === 1 ? "unidade" : "unidades"} no carrinho.
            </p>
          )}
          {!hasVariations && (
          <div className="mt-4 border-t pt-4">
            <p className="text-gray-500">Preço:</p>
            <ProductPrice
              price={visiblePrice}
              promo={visiblePromo}
            ></ProductPrice>
          </div>)}
          {hasVariations && (
            <div className="mt-4 border-t pt-4">
              <p className="text-gray-500 mb-2">Escolha uma opção:</p>
              <div className="flex flex-col gap-2">
                {variations.map((variation) => {
                  const label = Object.values(variation.options || {}).join(" / ");
                  const quantity = Number(variation.quantity || 0);
                  const selected = selectedVariationId === variation.id;
                  return (
                    <button
                      key={variation.id}
                      type="button"
                      disabled={quantity <= 0}
                      onClick={() => setSelectedVariationId(variation.id)}
                      className={`rounded-md border px-4 py-3 text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected
                          ? "border-black-1000 bg-gray-100"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="block text-sm text-gray-500">
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
          <div className="flex flex-col w-full cursor-pointer">
            {!hasStock ? (
              <a
                href={
                  storeWhatsapp
                    ? `https://api.whatsapp.com/send?phone=55${storeWhatsapp}&text=${stockMessage}`
                    : "#"
                }
                target="blank"
                aria-disabled={!storeWhatsapp}
                className="rounded-md flex flex-row text-white 
                                    bg-green-whatsapp gap-2 justify-center items-center p-2 h-12 mt-2 w-full aria-disabled:opacity-50"
              >
                <BsWhatsapp className="w-5 h-5"></BsWhatsapp>
                <span className="font-bold text-[14px]">
                  Me avise quando chegar
                </span>
              </a>
            ) : (
              <button
                type="button"
                className="rounded-md flex flex-row text-white 
                                    bg-brown-1000 gap-2 justify-center items-center p-2 h-12 mt-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div
              className="rounded-md border-[1px] border-rose-400 flex flex-row text-white 
                                    bg-rose-400 gap-2 justify-center items-center p-2 h-12 mt-2 w-full"
              onClick={() => {
                isInFavorites()
                  ? removeItemFavorites(props)
                  : handleOnAddToFavorites();
              }}
            >
              {isInFavorites() ? (
                <>
                  <FiHeart className="w-5 h-5 text-white"></FiHeart> Remover dos
                  favoritos
                </>
              ) : (
                <>
                  <FiHeart className="w-5 h-5 opacity-100 text-white"></FiHeart>{" "}
                  Adicionar aos favoritos
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
