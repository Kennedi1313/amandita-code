import { useState, useEffect } from "react";
import axios from "axios";
import { StoreInfo } from "../types/StoreInfo"; 
import { getStoreInfo } from "@/lib/client";

const useStoreInfo = (): StoreInfo | null => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const cachedStore = localStorage.getItem("storeInfo");
  
    if (cachedStore) {
      const parsedStore = JSON.parse(cachedStore) as StoreInfo;
  
      const updatedAt = new Date(parsedStore.updatedAt);
      const now = new Date();
      const diffInMs = now.getTime() - updatedAt.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  
      if (diffInDays < 1) {
        setStoreInfo(parsedStore);
        setHasMounted(true); 
        return;
      }
    }
  
    getStoreInfo()
      .then((res) => {
        setStoreInfo(res.data);
        localStorage.setItem("storeInfo", JSON.stringify(res.data));
      })
      .catch((err) => console.error("Failed to fetch store info:", err))
      .finally(() => {
        setHasMounted(true); 
      });
  }, []);

  if (!hasMounted || !storeInfo) return null;
  return storeInfo
}
export default useStoreInfo
