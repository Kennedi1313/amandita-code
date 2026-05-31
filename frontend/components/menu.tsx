import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePagination } from "./Context/paginationContext";
import SearchBar from "./searchMenu";
import { useRouter } from "next/router";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import useStoreInfo from "@/hooks/use-store-info";
import {
  FiHeart,
  FiMenu,
  FiShoppingBag,
  FiShoppingCart,
  FiUser,
  FiX,
} from "react-icons/fi";

export default function Menu() {
  const { updateCategory } = usePagination();
  const { cartCount } = useShoppingCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => setIsMenuOpen((current) => !current);

  const router = useRouter();
  const storeInfo = useStoreInfo();

  useEffect(() => {
    closeMenu();
  }, [router.asPath]);

  if (!storeInfo) return null;

  const isActive = (path: string) => router.asPath == path;

  return (
    <div
      id="menu-container"
      className="fixed top-0 w-full h-16 md:h-20 z-50 bg-white text-black-1000"
    >
      {/* Menu Links */}
      <menu
        id="menu"
        className={`fixed top-0 left-0 shadow-sm z-40 ${
          isMenuOpen ? "block" : "hidden"
        } md:block`}
      >
        <div className="top-16 flex md:top-20 fixed w-full justify-start z-100 bg-black/50 h-[calc(100vh-4rem)] md:h-12 items-center border-t-[0px] border-solid border-black-1000">
          <div
            className="z-100 flex flex-col items-center justify-start h-full w-[72%] bg-white md:w-full md:flex-row md:justify-center md:align-middle md:h-12"
          >
            <div className="flex w-full flex-1 flex-col gap-1 overflow-y-auto p-3 pb-6 md:flex-row md:items-center md:justify-center md:overflow-hidden md:p-2">
              {(storeInfo.categories ?? []).map((category) => (
                <Link
                  key={category.name}
                  href={category.path}
                  className={` no-underline border-none md:w-fit px-2 py-3 md:p-2 w-full text-left text-black-1000 cursor-pointer text-sm
                    ${isActive(category.path) ? "font-bold" : ""}`}
                  onClick={() => {
                    closeMenu();
                    updateCategory(category.name.toLowerCase());
                  }}
                >
                  {category.name}
                </Link>
              ))}
            </div>
            <div className="grid w-full grid-cols-3 border-t border-gray-100 bg-white md:hidden">
              <Link
                className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-gray-700"
                href="/favorites"
                onClick={() => {
                  closeMenu();
                }}
              >
                <FiHeart className="text-xl font-bold text-rose-400"></FiHeart>
                Favoritos
              </Link>
              <Link
                className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-gray-700"
                href="/sales"
                onClick={() => {
                  closeMenu();
                }}
              >
                <FiShoppingBag className="text-xl font-bold text-black-1000"></FiShoppingBag>
                Histórico
              </Link>
              <Link
                className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-gray-700"
                href="/account"
                onClick={() => {
                  closeMenu();
                }}
              >
                <FiUser className="text-xl font-bold text-black-1000"></FiUser>
                Conta
              </Link>
            </div>
          </div>
        </div>
      </menu>

      {/* Header */}
      <div className="fixed w-full h-16 md:h-20 flex flex-row justify-between bg-white items-center z-50 px-4 md:px-0">
        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex h-11 w-11 items-center justify-center z-[100]"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <FiX className="text-2xl font-bold"></FiX>
          ) : (
            <FiMenu className="text-2xl font-bold"></FiMenu>
          )}
        </button>

        {/* Logo */}
        <div className="absolute left-1/2 top-0 z-50 flex h-16 w-[10rem] -translate-x-1/2 justify-center md:relative md:left-1/3 md:h-[5rem] md:w-1/3 md:translate-x-0 md:self-start">
          <Link
            href={{ pathname: "/" }}
            className="relative h-full w-full overflow-hidden md:h-[5rem] md:w-[9rem]"
            onClick={() => {
              updateCategory("");
            }}
          >
            <Image
              src={
                storeInfo.logoUrl.match(/^https?:\/\//i)
                  ? storeInfo.logoUrl
                  : "/" + storeInfo.logoUrl + ".png"
              }
              alt="item"
              fill
              className="object-contain w-full"
            />
          </Link>
        </div>

        <div className="ml-auto flex flex-row justify-end md:justify-center items-center gap-1 md:gap-6 md:px-2 md:w-1/4">
          <SearchBar />
          <Link className="hidden md:flex h-9 w-9 items-center justify-center" href="/favorites" aria-label="Favoritos">
            <FiHeart className="text-2xl font-bold text-rose-400"></FiHeart>
          </Link>
          <Link
            className="relative flex h-9 w-9 items-center justify-center text-center"
            href="/checkout"
            aria-label="Carrinho"
          >
            <FiShoppingCart className="text-2xl font-bold text-black-1000"></FiShoppingCart>
            <span className="absolute -right-1 top-0 min-w-[1.1rem] rounded-full bg-black-1000 px-[5px] text-center text-[11px] leading-[1.1rem] text-white">
              {cartCount}
            </span>
          </Link>
          <Link
            className="hidden md:flex justify-center text-center items-end"
            href="/sales"
          >
            <FiShoppingBag className="text-2xl font-bold text-black-1000"></FiShoppingBag>
          </Link>
          <Link
            className="hidden md:left-0 md:relative md:flex md:justify-end"
            href="/account"
          >
            <FiUser className="text-2xl font-bold text-black-1000"></FiUser>
          </Link>
        </div>
      </div>
    </div>
  );
}
