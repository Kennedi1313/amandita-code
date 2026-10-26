import Item from "../components/item";
import Image from "next/image";
import { HomeProps, Product } from "@/types/ProductTypes";
import { getProductsPaginated } from "@/lib/productClient";
import useStoreInfo from "@/hooks/use-store-info";
import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";

export default function Home({ products, itemsCount }: HomeProps) {
  const [productList, setProductList] = useState<Product[]>(products);
  const [productListSize, setProductListSize] = useState<number>(itemsCount);
  const [hasMounted, setHasMounted] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const fetchProducts = async () => {
    setHasMounted(false);
    setLoadError(false);
    try {
      const data = await getProductsPaginated(0, "");
      setProductList(data.content);
      setProductListSize(data.totalElements);
    } catch (error) {
      console.error("Não foi possível carregar os produtos da loja.", error);
      setLoadError(true);
    } finally {
      setHasMounted(true);
    }
  };
  useEffect(() => {
    fetchProducts();
  }, []);
  const storeInfo = useStoreInfo();
  if (!storeInfo) return null;
  const hasUploadedBanner = Boolean(storeInfo.bannerUrl);
  const desktopBannerSrc = hasUploadedBanner
    ? storeInfo.bannerUrl
    : "/" + storeInfo.bannerUrl + ".png";
  const mobileBannerSrc = storeInfo.bannerMobileUrl || (hasUploadedBanner
    ? storeInfo.bannerUrl
    : "/" + storeInfo.bannerUrl + "_mobile.png");
  return (
    <div className="min-h-screen bg-[#fbfaf9] pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 md:pt-32 lg:px-8">
        {hasUploadedBanner ? <section
          aria-label="Apresentação da loja"
          className="overflow-hidden rounded-2xl bg-[#f3f0ed] shadow-sm ring-1 ring-black/5 sm:rounded-b-3xl"
        >
          <div className="relative aspect-square w-full sm:aspect-[2.15/1]">
            <Image
              src={desktopBannerSrc}
              alt={`Vitrine da loja ${storeInfo.name}`}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 1280px"
              className="hidden object-cover sm:block"
            />
            <Image
              src={mobileBannerSrc}
              alt={`Vitrine da loja ${storeInfo.name}`}
              fill
              priority
              sizes="100vw"
              className="object-cover sm:hidden"
            />
          </div>
        </section> : null}

        <section id="novidades" className="scroll-mt-28 py-12 sm:py-16">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Escolhas da loja
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
                Novidades
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
                Descubra os produtos que chegaram para você.
              </p>
            </div>
          </div>

          {!hasMounted ? (
            <div
              className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
              aria-label="Carregando produtos"
              aria-busy="true"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-square rounded-2xl bg-gray-200" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-1/3 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm"
            >
              <p className="text-lg font-semibold text-gray-900">
                Não foi possível carregar os produtos
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Verifique sua conexão e tente novamente.
              </p>
              <button
                type="button"
                onClick={fetchProducts}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                <FiRefreshCw aria-hidden="true" /> Tentar novamente
              </button>
            </div>
          ) : productListSize > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {productList.map((item) => (
                <Item
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  price={item.price}
                  quantity={item.quantity}
                  description={item.description}
                  promo={item.promo}
                  profileImageId={item.profileImageId}
                  variations={item.variations}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
              <p className="text-lg font-semibold text-gray-900">
                Novidades em breve
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Estamos preparando os produtos desta vitrine. Volte em breve
                para conferir.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export const getStaticProps = async () => {
  try {
    return { props: { products: [], itemsCount: 0 } };
  } catch (error) {
    return { props: { products: [], itemsCount: 0 } };
  }
};
