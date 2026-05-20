import { useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useShoppingFavorites } from "@/hooks/use-shopping-favorites";
import {
  BsCart,
  BsCartCheckFill,
  BsHeart,
  BsHeartFill,
  BsWhatsapp,
} from "react-icons/bs";
import Head from "next/head";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import Price from "@/components/productPrice";
import {
  getProducts,
  getProductsById,
  getProductsByIdNoStore,
  getProductsNoStore,
} from "@/lib/productClient";
import { Product } from "@/types/ProductTypes";
import Image from "next/image";
import useStoreInfo from "@/hooks/use-store-info";
import { FiHeart, FiShoppingBag, FiShoppingCart } from "react-icons/fi";
import ProductPrice from "@/components/productPrice";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Mousewheel, Keyboard } from "swiper/modules";

export default function Details(props: Product) {
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
  const toastId = useRef<string>("");

  const handleOnAddToCart = () => {
    addItemToCart(props);
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
      return Object.keys(cartDetails).includes(String(props.id));
    } else {
      return false;
    }
  };

  const storeInfo = useStoreInfo();
  if (!storeInfo) return null;

  return router.isFallback ? (
    <>
      <Head>
        <title>Loading...</title>
      </Head>
      <p className="text-center text-lg py-12">Loading...</p>
    </>
  ) : (
    <div className="md:container md:max-w-screen-lg mx-auto p-2 mt-[8.5rem] md:px-8 h-full">
      <div
        className="flex flex-col md:flex-row justify-between items-center space-y-8 container pt-2 
                    md:pt-12 md:space-y-0 md:space-x-12 h-full"
      >
        <div className="relative w-full h-[40rem] overflow-hidden">
          <Swiper
            style={
              {
                "--swiper-navigation-color": "#fff",
                "--swiper-pagination-color": "#fff",
              } as React.CSSProperties
            }
            cssMode={true}
            navigation={true}
            pagination={{ clickable: true }}
            mousewheel={true}
            keyboard={true}
            modules={[Navigation, Pagination, Mousewheel, Keyboard]}
            className="w-full h-[40rem]"
          >
            {(props.imagesIds?.length
              ? props.imagesIds
              : [{ imageId: props.profileImageId }]
            )
              .slice()
              .reverse()
              .map((img, i) => (
                <SwiperSlide key={i}>
                  <Image
                    src={`https://d26zivezixyii1.cloudfront.net/profile-images/${props.id}/${img}.jpg`}
                    alt="item"
                    width={768}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                </SwiperSlide>
              ))}
          </Swiper>
        </div>

        <div className="flex flex-col max-w-md w-full rounded-md gap-2">
          {props.quantity == 0 ? (
            <span className="text-xl font-semibold rounded-lg bg-red-600 py-2 px-4 text-white w-fit">
              Produto Indisponível
            </span>
          ) : (
            <></>
          )}
          <p className="text-2xl font-semibold">{props.name}</p>
          <div className="mt-4 border-t pt-4">
            <p className="text-gray-500">Preço:</p>
            <ProductPrice
              price={props.price}
              promo={props.promo}
            ></ProductPrice>
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-gray-500">Descrição:</p>
            <p className="whitespace-pre-line">{props.description}</p>
          </div>
          <div className="flex flex-col w-full cursor-pointer">
            {props.quantity == 0 ? (
              <a
                href={
                  "https://api.whatsapp.com/send?phone=8498594171&text=Olá,%20tudo%20bem?%20Gostaria%20de%20ser%20avisado%20quando%20este%20produto%20chegar%20em%20estoque:%20https://https://www." +
                  storeInfo.domain +
                  "/details/" +
                  props.id
                }
                target="blank"
                className="rounded-md flex flex-row text-white 
                                    bg-green-whatsapp gap-2 justify-center items-center p-2 h-12 mt-2 w-full"
              >
                <BsWhatsapp className="w-5 h-5"></BsWhatsapp>
                <span className="font-bold text-[14px]">
                  Me avise quando chegar
                </span>
              </a>
            ) : (
              <div
                className="rounded-md flex flex-row text-white 
                                    bg-brown-1000 gap-2 justify-center items-center p-2 h-12 mt-2 w-full"
                onClick={() => {
                  isInCart() ? removeItemCart(props) : handleOnAddToCart();
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
                    Adicionar ao carrinho{" "}
                  </>
                )}
              </div>
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

export async function getStaticPaths() {
  const data = await getProductsNoStore();
  const paths = data.content.map((product: Product) => ({
    params: { id: product.id.toString() },
  }));
  return { paths, fallback: true };
}

export async function getStaticProps({ params }: any) {
  try {
    const data = await getProductsByIdNoStore(params.id, "");
    return { props: data };
  } catch (error) {
    return { notFound: true };
  }
}
