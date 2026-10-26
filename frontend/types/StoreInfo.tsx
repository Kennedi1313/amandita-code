export interface Category {
  id: number;
  name: string;
  path: string;
}

export interface StoreInfo {
  id: number;
  plan?: "FREE" | "COMPLETE";
  name: string;
  domain: string;
  logoUrl: string;
  headerBackgroundColor?: string;
  bannerUrl: string;
  bannerMobileUrl?: string;
  iconUrl: string;
  asaasConfigured?: boolean;
  mercadoPagoConfigured?: boolean;
  checkoutEnabled?: boolean;
  mercadoPagoPublicKey?: string;
  melhorEnvioConfigured?: boolean;
  instagram: string;
  whatsapp: string;
  pickupEnabled?: boolean;
  pickupAddress?: {
    zip?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    reference?: string;
  } | null;
  melhorEnvioOriginAddress?: {
    zip?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    reference?: string;
  } | null;
  melhorEnvioOriginZip?: string | null;
  localDeliveryEnabled?: boolean;
  localDeliveryFee?: number;
  freeShippingMinAmount?: number;
  shippingOriginZip?: string;
  localDeliveryEta?: string;
  deliveryDistanceRanges?: Array<{ maxDistanceKm: number; fee: number }>;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}
