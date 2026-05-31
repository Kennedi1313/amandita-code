export type Product = {
  id: string;
  productId?: string;
  variationId?: number;
  variationLabel?: string;
  name: string;
  price: string;
  description: string;
  quantity: number;
  stockQuantity?: number;
  promo: number;
  profileImageId: string;
  imagesIds?: string[];
  variations?: ProductVariation[];
};

export type ProductVariation = {
  id: number;
  options: Record<string, string>;
  sku?: string;
  price: string;
  quantity: string;
  promo: number;
};

export type ProductsResponse = {
  content: Product[];
  totalElements: number;
};

export type HomeProps = {
  products: Product[];
  category: string;
  itemsCount: number;
};

export type CartDetails = {
  [productId: string]: Product;
};

export type Cart = {
  cartDetails: CartDetails;
  cartCount: number;
  currency: string;
};
