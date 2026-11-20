import Item from "../components/item";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { HomeProps, Product } from "@/types/ProductTypes";
import { getProductsPaginated, hasProductPromotion } from "@/lib/productClient";
import useStoreInfo from "@/hooks/use-store-info";
import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import Link from "next/link";
import {
  FiArrowRight,
  FiCreditCard,
  FiGift,
  FiMessageCircle,
  FiPackage,
  FiRefreshCw,
  FiTruck,
} from "react-icons/fi";
import { formatCurrency } from "@/lib/utils";

type StoreBenefit = {
  icon: IconType;
  title: string;
  detail: string;
};

function BenefitsCarousel({ benefits }: { benefits: StoreBenefit[] }) {
  const autoplay = useMemo(
    () => Autoplay({ delay: 4200, stopOnInteraction: false }),
    [],
  );
  const [viewportRef] = useEmblaCarousel(
    {
      loop: benefits.length > 1,
      draggable: false,
      align: "start",
    },
    [autoplay],
  );

  return (
    <div
      ref={viewportRef}
      role="region"
      aria-label="Benefícios da loja"
      aria-roledescription="carrossel"
      className="embla overflow-hidden border-t border-gray-100 bg-white"
    >
      <div className="embla__container" aria-live="off">
        {benefits.map(({ icon: Icon, title, detail }, index) => (
          <div
            key={title}
            className="embla__slide flex min-h-[4.5rem] items-center justify-center gap-3 px-4 py-3 sm:min-h-[5rem]"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${benefits.length}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f1ed] text-gray-800 sm:h-10 sm:w-10">
              <Icon aria-hidden="true" />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold leading-5 text-gray-900 sm:text-base">
                {title}
              </p>
              <p className="text-xs leading-4 text-gray-500 sm:text-sm">
                {detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const desktopBannerSrc = storeInfo.bannerUrl
    ? getBannerSource(storeInfo.bannerUrl)
    : "";
  const mobileBannerSrc = storeInfo.bannerMobileUrl
    ? getBannerSource(storeInfo.bannerMobileUrl)
    : "";
  const hasAnyBanner = Boolean(desktopBannerSrc || mobileBannerSrc);
  const canPayOnline = Boolean(
    storeInfo.mercadoPagoConfigured && storeInfo.mercadoPagoPublicKey,
  );
  const pickupAddress = storeInfo.pickupAddress;
  const hasPickupAddress = Boolean(
    pickupAddress?.zip?.trim() &&
      pickupAddress?.street?.trim() &&
      pickupAddress?.number?.trim() &&
      pickupAddress?.district?.trim() &&
      pickupAddress?.city?.trim() &&
      pickupAddress?.state?.trim(),
  );
  const canPickup = storeInfo.pickupEnabled === true && hasPickupAddress;
  const canDeliverLocally = Boolean(
    canPayOnline &&
      storeInfo.localDeliveryEnabled &&
      storeInfo.shippingOriginZip?.replace(/\D/g, "").length === 8 &&
      (storeInfo.deliveryDistanceRanges?.length || 0) > 0,
  );
  const canShipWithMelhorEnvio = Boolean(
    canPayOnline &&
      storeInfo.melhorEnvioConfigured &&
      (storeInfo.melhorEnvioOriginZip || "").replace(/\D/g, "").length === 8,
  );
  const freeShippingMinAmount = Number(storeInfo.freeShippingMinAmount || 0);
  const benefits = [
    ...(canPayOnline
      ? [{
          icon: FiCreditCard,
          title: "Pagamento online",
          detail: "Finalize pelo Mercado Pago.",
        }]
      : []),
    ...(canDeliverLocally && freeShippingMinAmount > 0
      ? [{
          icon: FiGift,
          title: "Frete grátis na entrega local",
          detail: `Em compras acima de ${formatCurrency(freeShippingMinAmount)}.`,
        }]
      : []),
    ...(canDeliverLocally || canShipWithMelhorEnvio
      ? [{
          icon: FiTruck,
          title: canDeliverLocally && canShipWithMelhorEnvio
            ? "Opções de entrega"
            : canShipWithMelhorEnvio
              ? "Envio pelo Melhor Envio"
              : "Entrega local",
          detail: canDeliverLocally && canShipWithMelhorEnvio
            ? "Entrega local e envio calculado pelo CEP."
            : canShipWithMelhorEnvio
              ? "Consulte preço e prazo pelo seu CEP."
              : "Consulte disponibilidade pelo seu CEP.",
        }]
      : []),
    ...(canPickup
      ? [{
          icon: FiPackage,
          title: "Retirada disponível",
          detail: "Retire seu pedido no endereço da loja.",
        }]
      : []),
    ...(storeInfo.whatsapp
      ? [{
          icon: FiMessageCircle,
          title: "Atendimento pelo WhatsApp",
          detail: "Fale diretamente com a loja.",
        }]
      : []),
  ].slice(0, 4);
  return (
    <div className="min-h-screen bg-[#fbfaf9] pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 md:pt-32 lg:px-8">
        {(hasAnyBanner || benefits.length > 0) && (
          <div
            className={`overflow-hidden rounded-b-2xl border-x border-b border-gray-100 bg-white shadow-sm ${
              mobileBannerSrc ? "mt-0" : "mt-4"
            } ${desktopBannerSrc ? "sm:mt-0" : "sm:mt-4"} ${
              !mobileBannerSrc && !benefits.length ? "hidden sm:block" : ""
            } ${!desktopBannerSrc && !benefits.length ? "sm:hidden" : ""}`}
          >
            {desktopBannerSrc && (
              <section
                aria-label="Banner desktop da loja"
                className="relative hidden aspect-[2.15/1] w-full bg-[#f3f0ed] sm:block"
              >
                <Image
                  src={desktopBannerSrc}
                  alt={`Vitrine da loja ${storeInfo.name}`}
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, 1280px"
                  className="object-cover"
                />
              </section>
            )}

            {mobileBannerSrc && (
              <section
                aria-label="Banner mobile da loja"
                className="relative aspect-square w-full bg-[#f3f0ed] sm:hidden"
              >
                <Image
                  src={mobileBannerSrc}
                  alt={`Vitrine da loja ${storeInfo.name}`}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              </section>
            )}

            {benefits.length > 0 && (
              <BenefitsCarousel benefits={benefits} />
            )}
          </div>
        )}

        {hasMounted && !loadError && productList.some(hasProductPromotion) && (
          <section className="py-7" aria-labelledby="promotions-title">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-rose-600">Oportunidades</p>
                <h2 id="promotions-title" className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  Em promoção
                </h2>
              </div>
              <Link
                href="/products/promo"
                className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-black"
              >
                Ver ofertas <FiArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {productList
                .filter(hasProductPromotion)
                .slice(0, 4)
                .map((item) => (
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
          </section>
        )}

        <section id="novidades" className="scroll-mt-28 py-8 sm:py-12">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                {productList.some(hasProductPromotion) ? "Conheça a coleção" : "Escolhas da loja"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
                Destaques da loja
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
                Descubra peças selecionadas para você.
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

const getBannerSource = (asset: string) => {
  if (/^https?:\/\//i.test(asset)) return asset;
  const normalized = asset.replace(/^\/+/, "").replace(/\.png$/i, "");
  return `/${normalized}.png`;
};

export const getStaticProps = async () => {
  try {
    return { props: { products: [], itemsCount: 0 } };
  } catch (error) {
    return { props: { products: [], itemsCount: 0 } };
  }
};
