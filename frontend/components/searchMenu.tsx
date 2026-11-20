import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { FiLoader, FiSearch, FiX } from "react-icons/fi";
import { getProductsByName } from "@/lib/productClient";
import { Product } from "@/types/ProductTypes";

export default function SearchBar({ iconColor = "currentColor" }: { iconColor?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionsError(false);
      return;
    }

    let isCurrent = true;
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsError(false);
      try {
        const response = await getProductsByName(query, 0);
        if (isCurrent) setSuggestions((response.content || []).slice(0, 5));
      } catch {
        if (isCurrent) {
          setSuggestions([]);
          setSuggestionsError(true);
        }
      } finally {
        if (isCurrent) setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (isMobileSearchOpen) {
      mobileInputRef.current?.focus();
    }
  }, [isMobileSearchOpen]);

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    setIsMobileSearchOpen(false);
    await router.push(`/search/${encodeURIComponent(query)}`);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsMobileSearchOpen(false);
      setSuggestions([]);
    }
  };

  const selectSuggestion = async (productId: string) => {
    setSuggestions([]);
    setIsMobileSearchOpen(false);
    await router.push(`/details/${productId}`);
  };

  const suggestionList = searchQuery.trim().length >= 2 ? (
    <div
      role="listbox"
      aria-label="Sugestões de produtos"
      className="absolute inset-x-0 top-full z-[60] mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 text-gray-900 shadow-xl"
    >
      {suggestionsLoading ? (
        <p className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500" role="status">
          <FiLoader className="animate-spin" aria-hidden="true" /> Buscando produtos…
        </p>
      ) : suggestions.length ? (
        <>
          {suggestions.map((product) => (
            <button
              key={product.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => selectSuggestion(String(product.id))}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{product.name}</span>
                {product.category ? <span className="block truncate text-xs text-gray-500">{product.category}</span> : null}
              </span>
              <span className="shrink-0 text-sm font-semibold">{product.price}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSearch()}
            className="w-full border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver todos os resultados para “{searchQuery.trim()}”
          </button>
        </>
      ) : (
        <p className="px-4 py-3 text-sm text-gray-500">
          {suggestionsError ? "Não foi possível carregar sugestões. Tente novamente." : "Nenhum produto encontrado."}
        </p>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="md:hidden flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        style={{ color: iconColor }}
        aria-label="Abrir busca"
        aria-expanded={isMobileSearchOpen}
        onClick={() => setIsMobileSearchOpen(true)}
      >
        <FiSearch className="text-[22px]" strokeWidth={2} />
      </button>

      {isMobileSearchOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40">
          <button
            type="button"
            className="fixed inset-0 top-16 bg-black/20"
            aria-label="Fechar busca"
            onClick={() => setIsMobileSearchOpen(false)}
          />
          <form
            onSubmit={handleSearch}
            className="relative flex w-full items-center gap-2 border-t border-gray-100 bg-white px-4 py-3 shadow-md"
          >
            <div className="flex min-w-0 flex-1 flex-row items-center rounded-full border-2 bg-gray-50 px-3" style={{ borderColor: iconColor }}>
              <FiSearch className="mr-2 shrink-0 text-xl text-gray-500" />
              <input
                ref={mobileInputRef}
                type="text"
                name="query"
                id="mobile-search"
                autoComplete="off"
                placeholder="Buscar produtos"
                className="min-w-0 flex-1 bg-transparent py-3 text-base text-gray-950 outline-none placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              aria-autocomplete="list"
              />
            </div>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-50"
              aria-label="Fechar busca"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              <FiX className="text-2xl" />
            </button>
            {suggestionList}
          </form>
        </div>
      )}

      <form
        onSubmit={handleSearch}
        className="hidden md:fixed md:left-0 md:top-4 md:z-50 md:flex md:h-12 md:w-1/3 md:items-center md:bg-transparent md:px-10 md:text-gray-500"
      >
        <div className="flex w-full flex-row rounded-full border-2 bg-gray-50 transition focus-within:bg-white" style={{ borderColor: iconColor }}>
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 transition hover:text-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            aria-label="Buscar"
          >
            <FiSearch className="text-xl" />
          </button>
        <input
          type="text"
          name="query"
          id="search"
          autoComplete="off"
          aria-label="Buscar produtos"
          placeholder="Buscar produtos"
          className="min-w-0 flex-1 rounded-full bg-transparent py-1 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
        />
      </div>
      {suggestionList}
      </form>
    </>
  );
}
