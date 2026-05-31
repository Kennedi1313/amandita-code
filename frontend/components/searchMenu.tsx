import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { FiSearch, FiX } from "react-icons/fi";

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    }
  };

  return (
    <>
      <button
        type="button"
        className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-gray-950 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
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
            <div className="flex min-w-0 flex-1 flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3">
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
          </form>
        </div>
      )}

      <form
        onSubmit={handleSearch}
        className="hidden md:fixed md:left-0 md:top-4 md:z-50 md:flex md:h-12 md:w-1/3 md:items-center md:bg-transparent md:px-10 md:text-gray-500"
      >
        <div className="flex w-full flex-row rounded-full border border-solid border-black">
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center"
            aria-label="Buscar"
          >
            <FiSearch className="text-2xl font-bold text-black" />
          </button>
        <input
          type="text"
          name="query"
          id="search"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full py-1 pr-3 text-black outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      </form>
    </>
  );
}
