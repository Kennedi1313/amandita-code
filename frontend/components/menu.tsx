import Link from "next/link";
import Image from "next/image";
import { HiOutlineBars3 } from "react-icons/hi2";
import { TfiClose } from "react-icons/tfi";
import PromotionBanner from "./promotionBanner";
import { usePagination } from "./Context/paginationContext";
import SearchBar from "./searchMenu";
import { TbHeartFilled } from "react-icons/tb";
import {
  BsBag,
  BsCart,
  BsCartCheckFill,
  BsHeart,
  BsPerson,
  BsShop,
} from "react-icons/bs";
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
  // Toggle menu visibility
  const toggleMenu = () => {
    const menu = document.getElementById("menu");
    const toggle = document.getElementById("toggle-button");
    const bar = document.getElementById("bar-icon");
    const times = document.getElementById("times-icon");

    menu?.classList.toggle("hidden");
    menu?.classList.toggle("h-screen");
    toggle?.classList.toggle("color-white");
    bar?.classList.toggle("hidden");
    times?.classList.toggle("hidden");
  };

  const router = useRouter();
  const storeInfo = useStoreInfo();
  if (!storeInfo) return null;

  const isActive = (path: string) => router.asPath == path;

  return (
    <div
      id="menu-container"
      className="fixed top-0 w-full h-20 z-50 bg-white text-black-1000"
    >
      {/* Menu Links */}
      <menu
        id="menu"
        className="fixed hidden md:block top-0 left-0 shadow-sm z-40"
      >
        <div className="top-[8.5rem] flex md:top-20 fixed w-full justify-start z-40 bg-black/50 h-full md:h-12 items-center border-t-[0px] border-solid border-black-1000">
          <div
            className="z-50 flex flex-col items-center justify-start h-full w-[70%] gap-2 bg-white p-2 md:w-full md:flex-row md:justify-center md:align-middle md:h-12 
            overflow-y-scroll md:overflow-hidden pb-[15rem] md:pb-2"
          >
            {storeInfo.categories.map((category) => (
              <Link
                key={category.name}
                href={category.path}
                className={` no-underline border-none md:w-fit p-2 w-full text-left text-black-1000 cursor-pointer text-sm
                    ${isActive(category.path) ? "font-bold" : ""}`}
                onClick={() => {
                  toggleMenu();
                  updateCategory(category.name.toLowerCase());
                }}
              >
                {category.name}
              </Link>
            ))}
            <Link
              className="flex w-1/2 md:left-0 md:relative md:hidden justify-left gap-2 fixed bottom-10 left-0 px-2 py-2 bg-white text-sm"
              href="/sales"
              onClick={() => {
                toggleMenu();
              }}
            >
              <FiShoppingBag className="text-base font-bold text-black-1000"></FiShoppingBag>
              Minhas compras
            </Link>
            <Link
              className="flex w-1/2 md:left-0 md:relative md:hidden justify-left gap-2 fixed bottom-0 left-0 px-2 py-4 bg-white text-sm"
              href="/account"
              onClick={() => {
                toggleMenu();
              }}
            >
              <FiUser className="text-base font-bold text-black-1000"></FiUser>
              Minha conta
            </Link>
          </div>
        </div>
      </menu>

      {/* Header */}
      <div className="fixed w-full h-20 flex flex-row justify-evenly md:justify-between bg-white  items-center z-50">
        {/* Mobile Menu Button */}
        <button
          id="toggle-button"
          className="md:hidden p-2 h-14 z-[100] w-1/4"
          onClick={toggleMenu}
        >
          <FiMenu id="bar-icon" className="text-2xl font-bold"></FiMenu>
          <FiX id="times-icon" className="text-2xl font-bold hidden"></FiX>
        </button>

        {/* Logo */}
        <div className="md:w-1/3 relative md:left-1/3 h-[5rem] z-50 flex justify-center self-start">
          <Link
            href={{ pathname: "/" }}
            className="w-[9rem] h-[5rem] relative overflow-hidden"
            onClick={() => {
              updateCategory("");
            }}
          >
            <Image
              src={"/" + storeInfo.logoUrl + ".png"}
              alt="item"
              fill
              className="object-contain w-full"
            />
          </Link>
        </div>

        {/* Search Bar */}
        <SearchBar />

        <div className="w-1/4 flex flex-row justify-end md:justify-center gap-4 md:gap-6 px-2">
          <Link className="flex justify-end" href="/favorites">
            <FiHeart className="text-2xl font-bold text-rose-400"></FiHeart>
          </Link>
          <Link
            className="flex justify-center text-center items-end"
            href="/cart"
          >
            <FiShoppingCart className="text-2xl font-bold text-black-1000"></FiShoppingCart>
            <span className="bg-black-1000 rounded-full text-white fixed px-[5px] text-xs mb-3 ml-6">
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
