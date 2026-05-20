import Image from "next/image";
import { useEffect, useState } from "react";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import ProtectedRoute from "../protectedRoute";
import Link from "next/link";
import Price from "@/components/productPrice";
import {
  FiChevronRight,
  FiFastForward,
  FiMinus,
  FiPlus,
  FiSkipForward,
  FiX,
  FiXCircle,
} from "react-icons/fi";

const Cart = () => {
  const { cartDetails, cartCount, addItemToCart, removeItem, clearCart } =
    useShoppingCart();
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, [cartCount]);

  if (!hasMounted) {
    return null;
  }

  return (
    <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
      {cartCount > 0 ? (
        <>
          <h2 className="text-4xl font-semibold">Seu Carrinho</h2>
          <p className="mt-1 text-xl">
            {cartCount} itens no carrinho{" "}
            <button
              onClick={clearCart}
              className="opacity-50 hover:opacity-100 text-base capitalize"
            >
              (Limpar tudo)
            </button>
          </p>
        </>
      ) : (
        <>
          <h2 className="text-4xl font-semibold">
            Nenhum produto adicionado ao carrinho.
          </h2>
          <div className="mt-1 text-xl">
            Encontre alguns produtos{" "}
            <Link href="/">
              <span className="text-black-1000 underline">aqui!</span>
            </Link>
          </div>
        </>
      )}

      {cartCount > 0 ? (
        <div className="mx-auto flex flex-col gap-2 md:px-0 py-5 my-2">
          {Object.entries(cartDetails).map(([key, product]: [any, any]) => (
            <div
              key={key}
              className="flex flex-col gap-4 md:flex-row justify-between space-x-4 rounded-md p-2"
            >
              {/* Image + Name */}
              <Link href={`/details/${product.id}`}>
                <div className="flex items-center space-x-4 group">
                  <div className="relative w-20 h-20 scale-110">
                    <Image
                      src={`https://d26zivezixyii1.cloudfront.net/profile-images/${product.id}/${product.profileImageId}.jpg`}
                      alt={product.name}
                      fill
                      loading="lazy"
                      className="object-cover rounded-md"
                      sizes="(max-width: 768px) 100vw,
                                    (max-width: 1200px) 50vw,
                                    33vw"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-xl group-hover:underline">
                      {product.name}
                    </p>
                  </div>
                </div>
              </Link>

              {/* Price + Actions */}
              <div className="flex items-center justify-around">
                {/* Quantity */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => removeItem(product)}
                    disabled={product?.quantity <= 1}
                    className="disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current rounded-md p-1"
                  >
                    <FiMinus className="w-6 h-6 flex-shrink-0" />
                  </button>
                  <p className="font-semibold text-xl">{product.quantity}</p>
                  <button
                    onClick={() => addItemToCart(product, 1)}
                    disabled={product?.quantity == 10}
                    className="disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current rounded-md p-1"
                  >
                    <FiPlus className="w-6 h-6 flex-shrink-0 " />
                  </button>
                </div>

                {/* Price */}
                <div className="font-semibold text-xl md:ml-16 items-center justify-center flex flex-row gap-2">
                  <FiX className="w-4 h-4 text-black-1000 inline-block" />
                  <div className="flex flex-col justify-start items-start ml-1">
                    <Price price={product.price} promo={product.promo}></Price>
                  </div>
                </div>

                {/* Remove item */}
                <button
                  onClick={() => removeItem(product, product.quantity)}
                  className="ml-4 hover:text-rose-500"
                >
                  <FiXCircle className="w-6 h-6 text-red-600" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-col justify-between py-4 mt-8 gap-2 w-full">
            <Link
              href={"/checkout"}
              className="text-white flex flex-row items-center justify-center gap-2 hover:gap-4 bg-black-1000 w-full md:w-1/3 self-end rounded-md px-5 py-3 md:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Redirecionando..." : "Continuar"}
              <FiChevronRight className="text-white text-lg"></FiChevronRight>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProtectedRoute(Cart);
