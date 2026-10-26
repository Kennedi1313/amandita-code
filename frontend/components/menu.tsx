import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePagination } from "./Context/paginationContext";
import SearchBar from "./searchMenu";
import { useRouter } from "next/router";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import useStoreInfo from "@/hooks/use-store-info";
import { getStoreInitials } from "@/lib/brand";
import {
  FiHeart,
  FiMenu,
  FiShoppingBag,
  FiShoppingCart,
  FiUser,
  FiX,
} from "react-icons/fi";

const getContrastingColor = (hexColor: string) => {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor || "")) return "#1F1D1B";
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
};

export default function Menu() {
  const { updateCategory } = usePagination();
  const { cartCount } = useShoppingCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => setIsMenuOpen((current) => !current);

  const router = useRouter();
  const storeInfo = useStoreInfo();
  const configuredHeaderBackgroundColor = storeInfo?.headerBackgroundColor || "";
  const headerBackgroundColor = /^#[0-9A-Fa-f]{6}$/.test(configuredHeaderBackgroundColor)
    ? configuredHeaderBackgroundColor
    : "#FFFFFF";
  const headerForegroundColor = getContrastingColor(headerBackgroundColor);

  useEffect(() => {
    closeMenu();
  }, [router.asPath]);

  if (!storeInfo) return null;

  const isActive = (path: string) => router.asPath == path;

  return (
    <div
      id="menu-container"
      className="fixed top-0 z-50 h-16 w-full border-b border-gray-100 shadow-sm backdrop-blur-md md:h-20"
      style={{ backgroundColor: headerBackgroundColor, color: headerForegroundColor }}
    >
      {/* Menu Links */}
      <menu
        id="menu"
        className={`fixed top-0 left-0 shadow-sm z-40 ${
          isMenuOpen ? "block" : "hidden"
        } md:block`}
      >
        <div className="fixed top-16 z-40 flex h-[calc(100vh-4rem)] w-full items-start justify-start bg-black/40 md:top-20 md:h-12 md:items-center md:border-t md:border-gray-100 md:bg-white md:shadow-sm">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-transparent md:hidden"
            aria-label="Fechar menu"
            onClick={closeMenu}
          />
          <div
            className="z-40 flex h-full w-[82%] flex-col items-center justify-start bg-white shadow-xl md:h-12 md:w-full md:flex-row md:justify-center md:shadow-none"
          >
            <div className="flex w-full flex-1 flex-col gap-1 overflow-y-auto p-3 pb-6 md:flex-row md:items-center md:justify-center md:overflow-hidden md:p-2">
              {(storeInfo.categories ?? []).map((category) => (
                <Link
                  key={category.name}
                  href={category.path}
                  aria-current={isActive(category.path) ? "page" : undefined}
                  className={`w-full cursor-pointer rounded-lg border-none px-3 py-3 text-left text-sm text-gray-700 no-underline transition hover:bg-gray-50 hover:text-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-900 md:w-fit md:px-4 md:py-2 ${
                    isActive(category.path)
                      ? "bg-gray-50 font-semibold text-gray-950 md:bg-transparent md:underline md:decoration-2 md:underline-offset-8"
                      : ""
                  }`}
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
      <div
        className="fixed w-full h-16 md:h-20 flex flex-row justify-between items-center z-50 px-4 md:px-0"
        style={{ backgroundColor: headerBackgroundColor, color: headerForegroundColor }}
      >
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
        <div className="absolute content-center align-center left-1/2 top-0 z-50 flex h-16 w-[10rem] -translate-x-1/2 justify-center md:relative md:left-1/3 md:h-[5rem] md:w-1/3 md:translate-x-0 md:self-start">
          <Link
            href={{ pathname: "/" }}
            className="relative h-full w-full overflow-hidden md:h-[5rem] md:w-[9rem] content-center align-center"
            onClick={() => {
              updateCategory("");
            }}
          >
            {storeInfo.logoUrl ? <Image
              src={
                storeInfo.logoUrl.match(/^https?:\/\//i)
                  ? storeInfo.logoUrl
                  : "/" + storeInfo.logoUrl + ".png"
              }
              alt={`Página inicial de ${storeInfo.name}`}
              fill
              className="object-contain w-full"
            /> : <span className="flex h-[3.5rem] w-[3.5rem] rounded-full items-center justify-center font-serif text-[3rem] font-bold tracking-[-1px]" style={{ margin: "0 auto", backgroundColor: headerBackgroundColor, color: headerForegroundColor }}>
              {getStoreInitials(storeInfo.name)}
            </span>}
          </Link>
        </div>

        <div className="ml-auto flex flex-row justify-end md:justify-center items-center gap-1 md:gap-6 md:px-2 md:w-1/4">
          <SearchBar iconColor={headerForegroundColor} />
          <Link className="hidden md:flex h-9 w-9 items-center justify-center" href="/favorites" aria-label="Favoritos">
            <FiHeart className="text-2xl font-bold"></FiHeart>
          </Link>
          <Link
            className="relative flex h-9 w-9 items-center justify-center text-center"
            href="/checkout"
            aria-label="Carrinho"
          >
            <FiShoppingCart className="text-2xl font-bold"></FiShoppingCart>
            <span
              className="absolute -right-1 -top-0.5 min-w-[1.2rem] rounded-full px-1 text-center text-[11px] font-semibold leading-5"
              style={{ backgroundColor: headerForegroundColor, color: headerBackgroundColor }}
            >
              {cartCount}
            </span>
          </Link>
          <Link
            className="hidden md:flex justify-center text-center items-end"
            href="/sales"
          >
            <FiShoppingBag className="text-2xl font-bold"></FiShoppingBag>
          </Link>
          <Link
            className="hidden md:left-0 md:relative md:flex md:justify-end"
            href="/account"
          >
            <FiUser className="text-2xl font-bold"></FiUser>
          </Link>
        </div>
      </div>
    </div>
  );
}
