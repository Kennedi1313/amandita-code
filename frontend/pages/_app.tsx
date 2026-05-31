import "../styles/globals.css";
import type { AppProps } from "next/app";
import { FavoritesProvider } from "@/hooks/use-shopping-favorites";
import Footer from "../components/footer";
import { Toaster } from "react-hot-toast";
import ContactFloating from "@/components/contactFloating";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/hooks/use-shopping-cart";
import AuthProvider from "@/components/Context/authContext";
import { PaginationProvider } from "@/components/Context/paginationContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Menu from "@/components/menu";
import Head from "next/head";
import useStoreInfo from "@/hooks/use-store-info";
declare global {
  interface Window {
    // TODO: replace this with a more specific type based on usage
    dataLayer: any[];
  }
}
export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: any, { shallow }: any) => {
      if (url.startsWith("/details")) {
        sessionStorage.setItem("scrollPosition", window.scrollY.toString());
        sessionStorage.setItem("page", window.location.href);
      }
    };

    const handleRouteComplete = (e: any) => {
      let url = window.location.href;
      if (!url.includes("/details")) {
        const scrollPosition = sessionStorage.getItem("scrollPosition");
        const previousPage = sessionStorage.getItem("page");
        if (
          "scrollRestoration" in window.history &&
          scrollPosition &&
          previousPage &&
          previousPage == url
        ) {
          window.history.scrollRestoration = "manual";
          window.scrollTo(0, parseInt(scrollPosition, 10));
          sessionStorage.setItem("page", "");
        }
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);
    router.events.on("routeChangeComplete", handleRouteComplete);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
      router.events.off("routeChangeComplete", handleRouteComplete);
    };
  }, []);
  const storeInfo = useStoreInfo();
  if (!storeInfo) return null;
  return (
    <>
      <Head>
        <title>
          {storeInfo.name} | @{storeInfo.instagram}
        </title>
        <link
          rel="icon"
          href={
            storeInfo.iconUrl.match(/^https?:\/\//i)
              ? storeInfo.iconUrl
              : "/" + storeInfo.iconUrl + ".png"
          }
        />
      </Head>
      <HelmetProvider>
        <Helmet>
          <meta
            name="description"
            content="Clique e conheça a mais nova loja de joias em prata 925 de Natal/RN!"
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={"https://www." + storeInfo.domain} />
          <meta
            property="og:title"
            content="Amandita Pratas | Joias em prata 925"
          />
          <meta
            property="og:description"
            content="Clique e conheça a mais nova loja de joias em prata 925 de Natal/RN!"
          />
          <meta
            property="og:image"
            content="https://amandita-uploads.s3.sa-east-1.amazonaws.com/profile-images/22/aa399f2b-a880-4f19-bf40-6e5d05efa696.jpg"
          />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            name="google-site-verification"
            content="mghPEugrbz3VbC_q2WQWAF5h-wZVHYf-7nbbenYIbbI"
          />
          {
            <meta
              http-equiv="Content-Security-Policy"
              content="upgrade-insecure-requests"
            />
          }
        </Helmet>
        <AuthProvider>
          <PaginationProvider>
            <CartProvider>
              <FavoritesProvider>
                <div>
                  <Menu></Menu>
                  <main>
                    <Component {...pageProps} />
                    <ContactFloating></ContactFloating>
                    <Footer></Footer>
                  </main>
                </div>
              </FavoritesProvider>
            </CartProvider>
          </PaginationProvider>
        </AuthProvider>
        <Toaster />
      </HelmetProvider>
    </>
  );
}
