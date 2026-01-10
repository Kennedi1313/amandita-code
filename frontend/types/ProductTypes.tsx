export type Product = {
  id: string;
  name: string;
  price: string;
  description: string;
  quantity: number;
  promo: number;
  profileImageId: string;
  imagesIds?: string[];
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