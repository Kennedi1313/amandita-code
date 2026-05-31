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
        className="flex flex-col gap-2 w-full h-[28rem] bg-white"
      >
        <div className="h-[20rem] w-full relative">
          <Image
            src={getProductImageUrl(props.id)}
            alt={props.name}
            quality={50}
            className="bg-gray-100 object-cover"
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="flex flex-col justify-between overflow-hidden gap-2">
          <span className="text-md leading-5 font-thin text-gray-800">
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
        className="rounded-full absolute right-1 top-2 border-[1px] border-gray-200 flex flex-row text-black
            bg-white opacity-80 justify-center items-center p-3"
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
          target="blank"
          className="rounded-md flex flex-row text-white 
                    bg-green-whatsapp gap-2 justify-center items-center py-2 px-4
                    absolute left-[3%] w-[94%] md:h-10 bottom-[30%]"
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
