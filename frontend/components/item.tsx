import { useShoppingFavorites } from "@/hooks/use-shopping-favorites";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { getProductImageUrl } from "@/lib/productClient";
import {
  BsCart,
  BsCartCheck,
  BsCartCheckFill,
  BsHeart,
  BsHeartFill,
  BsStar,
  BsStarFill,
  BsWhatsapp,
} from "react-icons/bs";
import Share from "./shareSocial";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import useStoreInfo from "@/hooks/use-store-info";
import ProductPrice from "./productPrice";

interface ItemProps {
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
}

export default function Item(props: ItemProps) {
  const {
    favoritesCount,
    addItemToFavorites,
    favoritesDetails,
    removeItem: removeItemFavorites,
  } = useShoppingFavorites();
  const [adding, setAdding] = useState(false);
  const toastId = useRef<string>();
  const isInFavorites = () => {
    if (favoritesDetails) {
      return Object.keys(favoritesDetails).includes(String(props.id));
    } else {
      return false;
    }
  };

  const handleOnAddToFavorites = () => {
    setAdding(true);
    addItemToFavorites(props);
    setAdding(false);
    toast.success(`${props.name} adicionado aos favoritos!`, {
      id: toastId.current,
    });
  };

  const storeInfo = useStoreInfo();
  if (!storeInfo) return null;

  const hasVariations = props.variations && props.variations.length > 0;
  const totalQuantity = hasVariations
    ? props.variations!.reduce(
        (total, variation) => total + Number(variation.quantity || 0),
        0,
      )
    : props.quantity;
  const prices = hasVariations
    ? props.variations!
        .map((variation) =>
          Number(variation.price.replace(".", "").replace(",", ".")),
        )
        .filter((price) => price > 0)
    : [];
  const priceText =
    prices.length > 0
      ? `R$ ${Math.min(...prices).toFixed(2).replace(".", ",")} - R$ ${Math.max(
          ...prices,
        )
          .toFixed(2)
          .replace(".", ",")}`
      : null;

  return (
    <div className="relative">
      <Link
        href={"/details/" + props.id}
        className="group flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:p-3"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#f4f2ef]">
          <Image
            src={getProductImageUrl(props.id)}
            alt={props.name}
            quality={50}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="flex min-h-[4.5rem] flex-1 flex-col justify-between gap-2 px-1 pb-1">
          <span className="line-clamp-2 text-sm font-medium leading-5 text-gray-800 sm:text-base">
            {props.name}
          </span>
          {priceText ? (
            <span className="font-semibold">{priceText}</span>
          ) : (
            <ProductPrice price={props.price} promo={props.promo}></ProductPrice>
          )}
        </div>
      </Link>

      <button
        type="button"
        aria-label={`${isInFavorites() ? "Remover dos favoritos" : "Adicionar aos favoritos"}: ${props.name}`}
        aria-pressed={isInFavorites()}
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-rose-400 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        disabled={adding}
        onClick={() => {
          isInFavorites()
            ? removeItemFavorites(props)
            : handleOnAddToFavorites();
        }}
      >
        {isInFavorites() ? (
          <BsHeartFill className="w-5 h-5 text-rose-400"></BsHeartFill>
        ) : (
          <BsHeart className="w-5 h-5 opacity-100 text-rose-400"></BsHeart>
        )}
      </button>

      <Share
        productName={props.name}
        productUrl={"https://www." + storeInfo.domain + "/details/" + props.id}
      />

      {totalQuantity > 0 && props.promo > 0 && !hasVariations ? (
        <span className="font-bold text-[14px] absolute left-[3%] top-2 rounded-lg bg-brown-1000 py-2 px-4 text-white w-fit">
          -{props.promo}%
        </span>
      ) : (
        <></>
      )}

      {totalQuantity == 0 ? (
        <span className="font-bold text-[14px] absolute left-[3%] w-[60%] top-2 rounded-lg bg-red-600 py-2 px-4 text-white md:w-fit">
          Produto Indisponível
        </span>
      ) : (
        <></>
      )}

      {totalQuantity == 0 && storeInfo.whatsapp ? (
        <a
          href={
            `https://api.whatsapp.com/send?phone=${storeInfo.whatsapp.replace(/\D/g, "")}&text=${encodeURIComponent(
              `Olá, tudo bem? Gostaria de ser avisado quando este produto chegar em estoque: https://${storeInfo.domain}/details/${props.id}`,
            )}`
          }
          target="_blank"
          rel="noreferrer"
          className="absolute inset-x-3 bottom-3 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-green-whatsapp px-3 py-2 text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          <BsWhatsapp className="w-5 h-5"></BsWhatsapp>
          <span className="font-bold text-[14px]">Me avise quando chegar</span>
        </a>
      ) : (
        <></>
      )}
    </div>
  );
}
