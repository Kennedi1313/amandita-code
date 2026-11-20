import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePagination } from "./Context/paginationContext";
import SearchBar from "./searchMenu";
import { useRouter } from "next/router";
import { useShoppingCart } from "@/hooks/use-shopping-cart";
import useStoreInfo from "@/hooks/use-store-info";
import { getStoreInitials } from "@/lib/brand";
import type { Category } from "@/types/StoreInfo";
import {
  FiChevronDown,
  FiChevronRight,
  FiHeart,
  FiMenu,
  FiShoppingBag,
  FiShoppingCart,
  FiUser,
  FiX,
} from "react-icons/fi";

type CategoryMenuNode = Category & { children: CategoryMenuNode[] };

const buildCategoryTree = (categories: Category[]): CategoryMenuNode[] => {
  const nodes = new Map(
    categories.map((category) => [
      String(category.id),
      { ...category, children: [] as CategoryMenuNode[] },
    ]),
  );
  const roots: CategoryMenuNode[] = [];

  categories.forEach((category) => {
    const node = nodes.get(String(category.id));
    const parent = category.parentId
      ? nodes.get(String(category.parentId))
      : undefined;

    if (!node || !parent || parent.id === node.id) {
      if (node) roots.push(node);
      return;
    }

    let ancestor: CategoryMenuNode | undefined = parent;
    const visited = new Set<string>();
    let createsCycle = false;

    while (ancestor && !visited.has(String(ancestor.id))) {
      const ancestorId = String(ancestor.id);
      if (ancestorId === String(node.id)) {
        createsCycle = true;
        break;
      }
      visited.add(ancestorId);
      ancestor = ancestor.parentId
        ? nodes.get(String(ancestor.parentId))
        : undefined;
    }

    if (createsCycle) roots.push(node);
    else parent.children.push(node);
  });

  return roots;
};

const MobileCategoryBranch = ({
  category,
  depth = 0,
  onNavigate,
}: {
  category: CategoryMenuNode;
  depth?: number;
  onNavigate: (category: CategoryMenuNode) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2">
        <Link
          href={category.path}
          className="min-h-12 flex-1 rounded-lg px-3 py-3 text-left text-sm text-gray-700 no-underline hover:bg-gray-50"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onNavigate(category)}
        >
          {category.name}
        </Link>
        {category.children.length > 0 && (
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label={`${isExpanded ? "Recolher" : "Expandir"} ${category.name}`}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <FiChevronDown
              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      {isExpanded && category.children.length > 0 && (
        <div className="ml-3 border-l border-gray-200">
          {category.children.map((child) => (
            <MobileCategoryBranch
              key={child.id}
              category={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DesktopCategoryBranch = ({
  category,
  onNavigate,
}: {
  category: CategoryMenuNode;
  onNavigate: (category: CategoryMenuNode) => void;
}) => {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const hasChildren = category.children.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (hasChildren) setIsSubmenuOpen(true);
      }}
      onMouseLeave={() => setIsSubmenuOpen(false)}
      onFocus={() => {
        if (hasChildren) setIsSubmenuOpen(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsSubmenuOpen(false);
        }
      }}
    >
      <div className="flex items-center">
        <Link
          href={category.path}
          className="min-w-0 flex-1 rounded-md py-2 pl-3 pr-2 text-sm text-gray-700 no-underline hover:bg-gray-50 hover:text-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900"
          onClick={() => onNavigate(category)}
        >
          {category.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-950"
            aria-label={`${isSubmenuOpen ? "Fechar" : "Abrir"} subcategorias de ${category.name}`}
            aria-expanded={isSubmenuOpen}
            onClick={() => setIsSubmenuOpen((current) => !current)}
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        )}
      </div>
      {hasChildren && isSubmenuOpen && (
        <div className="absolute left-full top-0 z-[80] min-w-56 rounded-lg border border-gray-100 bg-white p-2 shadow-lg">
          {category.children.map((child) => (
            <DesktopCategoryBranch
              key={child.id}
              category={child}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const getContrastingColor = (hexColor: string) => {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor || "")) return "#1F1D1B";
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
};

export default function Menu() {
  const { updateCategory } = usePagination();
  const { cartCount } = useShoppingCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDesktopCategoryId, setOpenDesktopCategoryId] = useState<
    number | null
  >(null);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => setIsMenuOpen((current) => !current);

  const router = useRouter();
  const storeInfo = useStoreInfo();
  const configuredHeaderBackgroundColor =
    storeInfo?.headerBackgroundColor || "";
  const headerBackgroundColor = /^#[0-9A-Fa-f]{6}$/.test(
    configuredHeaderBackgroundColor,
  )
    ? configuredHeaderBackgroundColor
    : "#FFFFFF";
  const headerForegroundColor = getContrastingColor(headerBackgroundColor);

  useEffect(() => {
    closeMenu();
    setOpenDesktopCategoryId(null);
  }, [router.asPath]);

  if (!storeInfo) return null;

  const categoryTree = buildCategoryTree(storeInfo.categories ?? []);
  const isActive = (path: string) => router.asPath == path;
  const handleCategoryNavigate = (category: CategoryMenuNode) => {
    closeMenu();
    setOpenDesktopCategoryId(null);
    updateCategory(category.name.toLowerCase());
  };

  return (
    <div
      id="menu-container"
      className="fixed top-0 z-50 h-16 w-full border-b border-gray-100 shadow-sm backdrop-blur-md md:h-20"
      style={{
        backgroundColor: headerBackgroundColor,
        color: headerForegroundColor,
      }}
    >
      {/* Menu Links */}
      <menu
        id="menu"
        className={`fixed inset-0 left-0 z-[60] shadow-sm md:inset-auto md:top-0 md:z-40 ${
          isMenuOpen ? "block" : "hidden"
        } md:block`}
      >
        <div className="fixed inset-0 z-[60] flex h-[100dvh] w-full flex-col items-start justify-start bg-white md:inset-x-0 md:bottom-auto md:top-20 md:h-12 md:flex-row md:items-center md:border-t md:border-gray-100 md:bg-white md:shadow-sm">
          <div
            className="flex h-16 w-full shrink-0 items-center justify-between border-b border-gray-100 px-5 md:hidden"
            style={{
              backgroundColor: headerBackgroundColor,
              color: headerForegroundColor,
            }}
          >
            <span className="text-sm font-semibold">Categorias</span>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center"
              aria-label="Fechar menu"
              onClick={closeMenu}
            >
              <FiX className="text-2xl" />
            </button>
          </div>
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start bg-white md:z-40 md:h-full md:w-full md:flex-row md:justify-center">
            <div className="flex w-full flex-1 flex-col gap-1 overflow-y-auto p-3 pb-6 md:hidden">
              {categoryTree.map((category) => (
                <MobileCategoryBranch
                  key={category.id}
                  category={category}
                  onNavigate={handleCategoryNavigate}
                />
              ))}
            </div>
            <div className="hidden h-full w-full flex-1 items-center justify-center gap-1 px-2 md:flex">
              {categoryTree.map((category) => {
                const hasChildren = category.children.length > 0;
                const isDropdownOpen = openDesktopCategoryId === category.id;

                return (
                  <div
                    key={category.id}
                    className="relative flex h-full items-center"
                    onMouseEnter={() => {
                      if (hasChildren) setOpenDesktopCategoryId(category.id);
                    }}
                    onMouseLeave={() => setOpenDesktopCategoryId(null)}
                    onFocus={() => {
                      if (hasChildren) setOpenDesktopCategoryId(category.id);
                    }}
                    onBlur={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node,
                        )
                      ) {
                        setOpenDesktopCategoryId(null);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <Link
                        href={category.path}
                        aria-current={
                          isActive(category.path) ? "page" : undefined
                        }
                        className={`cursor-pointer rounded-lg px-3 py-2 text-sm text-gray-700 no-underline transition hover:bg-gray-50 hover:text-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-900 ${
                          isActive(category.path)
                            ? "font-semibold text-gray-950 underline decoration-2 underline-offset-8"
                            : ""
                        }`}
                        onClick={() => handleCategoryNavigate(category)}
                      >
                        {category.name}
                      </Link>
                      {hasChildren && (
                        <button
                          type="button"
                          className="flex h-9 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-50"
                          aria-label={`${isDropdownOpen ? "Fechar" : "Abrir"} subcategorias de ${
                            category.name
                          }`}
                          aria-expanded={isDropdownOpen}
                          onClick={() =>
                            setOpenDesktopCategoryId(
                              isDropdownOpen ? null : category.id,
                            )
                          }
                        >
                          <FiChevronDown
                            className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                    {hasChildren && isDropdownOpen && (
                      <div className="absolute left-0 top-full z-[70] min-w-56 rounded-lg border border-gray-100 bg-white p-2 shadow-lg">
                        {category.children.map((child) => (
                          <DesktopCategoryBranch
                            key={child.id}
                            category={child}
                            onNavigate={handleCategoryNavigate}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
        style={{
          backgroundColor: headerBackgroundColor,
          color: headerForegroundColor,
        }}
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
            {storeInfo.logoUrl ? (
              <Image
                src={
                  storeInfo.logoUrl.match(/^https?:\/\//i)
                    ? storeInfo.logoUrl
                    : "/" + storeInfo.logoUrl + ".png"
                }
                alt={`Página inicial de ${storeInfo.name}`}
                fill
                className="object-contain w-full"
              />
            ) : (
              <span
                className="flex h-[3.5rem] w-[3.5rem] rounded-full items-center justify-center font-serif text-[3rem] font-bold tracking-[-1px]"
                style={{
                  margin: "0 auto",
                  backgroundColor: headerBackgroundColor,
                  color: headerForegroundColor,
                }}
              >
                {getStoreInitials(storeInfo.name)}
              </span>
            )}
          </Link>
        </div>

        <div className="ml-auto flex flex-row justify-end md:justify-center items-center gap-1 md:gap-6 md:px-2 md:w-1/4">
          <SearchBar iconColor={headerForegroundColor} />
          <Link
            className="hidden md:flex h-9 w-9 items-center justify-center"
            href="/favorites"
            aria-label="Favoritos"
          >
            <FiHeart className="text-2xl font-bold"></FiHeart>
          </Link>
          <Link
            className="relative flex h-9 w-9 items-center justify-center text-center"
            href="/cart"
            aria-label="Carrinho"
          >
            <FiShoppingCart className="text-2xl font-bold"></FiShoppingCart>
            <span
              className="absolute -right-1 -top-0.5 min-w-[1.2rem] rounded-full px-1 text-center text-[11px] font-semibold leading-5"
              style={{
                backgroundColor: headerForegroundColor,
                color: headerBackgroundColor,
              }}
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
