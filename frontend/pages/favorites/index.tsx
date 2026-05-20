import Link from "next/link";
import { useShoppingFavorites } from "@/hooks/use-shopping-favorites";
import Item from "@/components/item";

export default function Details() {
  const { favoritesDetails, favoritesCount, clearFavorites } =
    useShoppingFavorites();

  return (
    <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
      {favoritesCount > 0 ? (
        <>
          <h2 className="text-4xl font-semibold">Seus Favoritos</h2>
          <p className="mt-1 text-xl">
            {favoritesCount} itens nos favoritos{" "}
            <button
              onClick={clearFavorites}
              className="opacity-50 hover:opacity-100 text-base capitalize"
            >
              (Limpar tudo)
            </button>
          </p>
        </>
      ) : (
        <>
          <h2 className="text-4xl font-semibold">
            {" "}
            Nenhum produto adicionado aos favoritos.{" "}
          </h2>
          <div className="mt-1 text-xl">
            Encontre alguns produtos{" "}
            <Link href="/">
              {" "}
              <span className="text-black-1000 underline">aqui!</span>{" "}
            </Link>
          </div>
        </>
      )}

      {favoritesCount > 0 ? (
        <div className="mx-auto flex items-center justify-center px-1 md:px-0 py-5 my-2">
          <div className="center grid lg:grid-cols-5 grid-cols-2 w-full gap-1 gap-y-6">
            {Object.entries(favoritesDetails).map(([key, item]: [any, any]) => (
              <Item
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                description={item.description}
                quantity={item.quantity}
                promo={item.promo}
                profileImageId={item.profileImageId}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
