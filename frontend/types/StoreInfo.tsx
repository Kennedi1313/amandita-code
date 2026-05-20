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
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}
