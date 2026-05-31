import { useState, useEffect } from "react";
import { StoreInfo } from "../types/StoreInfo";
import { getStoreInfo } from "@/lib/client";
import { getCurrentStoreDomain } from "@/lib/productClient";

const normalizeAssetPath = (value: string) => {
  if (!value) return value;
  if (value.match(/^https?:\/\//i)) return value;
  const trimmed = value.startsWith("/") ? value.substring(1) : value;
  return trimmed.replace(/\.png$/i, "");
};

const normalizeStoreInfo = (storeInfo: StoreInfo): StoreInfo => ({
  ...storeInfo,
  logoUrl: normalizeAssetPath(storeInfo.logoUrl),
  bannerUrl: normalizeAssetPath(storeInfo.bannerUrl),
  iconUrl: normalizeAssetPath(storeInfo.iconUrl),
  categories: storeInfo.categories ?? [],
});

const useStoreInfo = (): StoreInfo | null => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const storeDomain = getCurrentStoreDomain();
    const cacheKey = storeDomain ? `storeInfo:${storeDomain}` : "storeInfo";
    const cachedStore = localStorage.getItem(cacheKey);

    if (cachedStore) {
      try {
        const parsedStore = JSON.parse(cachedStore) as StoreInfo;
        const normalizedStore = normalizeStoreInfo(parsedStore);
        setStoreInfo(normalizedStore);
        setHasMounted(true);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    getStoreInfo()
      .then((res) => {
        const normalizedStore = normalizeStoreInfo(res.data);
        setStoreInfo(normalizedStore);
        localStorage.setItem(cacheKey, JSON.stringify(normalizedStore));
      })
      .catch((err) => console.error("Failed to fetch store info:", err))
      .finally(() => {
        setHasMounted(true);
      });
  }, []);

  if (!hasMounted || !storeInfo) return null;
  return storeInfo;
};
export default useStoreInfo;
