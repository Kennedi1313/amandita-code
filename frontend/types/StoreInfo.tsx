export interface Category {
  id: number;
  name: string;
  path: string;
}

export interface StoreInfo {
  id: number;
  name: string;
  domain: string;
  logoUrl: string;
  bannerUrl: string;
  iconUrl: string;
  mercadoPagoPublicKey: string;
  instagram: string;
  whatsapp: string;
  pickupEnabled?: boolean;
  localDeliveryEnabled?: boolean;
  localDeliveryFee?: number;
  freeShippingMinAmount?: number;
  shippingOriginZip?: string;
  localDeliveryEta?: string;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}
