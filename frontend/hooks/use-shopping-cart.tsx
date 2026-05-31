import React, {
  useContext,
  useReducer,
  useMemo,
  Reducer,
  Dispatch,
  ReactElement,
} from "react";
import useLocalStorageReducer from "./use-local-storage-reducer-cart";
import { Cart, Product } from "@/types/ProductTypes";

// Reducers
const initialCartValues: Cart = {
  cartDetails: {},
  cartCount: 0,
  currency: "BRL",
};

export interface Action {
  type: string;
  quantity: number;
  product: Product;
}

const addItemToCart = (
  state: Cart = {} as Cart,
  product: Product | null = null,
  quantity = 0,
) => {
  if (quantity <= 0 || !product) return state;

  const cartKey = String(product.id);
  let entry = state?.cartDetails?.[cartKey];
  const stockQuantity = Number(entry?.stockQuantity ?? product.stockQuantity ?? product.quantity ?? 0);
  const nextQuantity = entry ? entry.quantity + quantity : quantity;

  if (stockQuantity > 0 && nextQuantity > stockQuantity) {
    return state;
  }

  // Update item
  if (entry) {
    return {
      ...state,
      cartDetails: {
        ...state.cartDetails,
        [cartKey]: {
          ...entry,
          quantity: nextQuantity,
        },
      },
      cartCount: Math.max(0, state.cartCount + quantity),
    };
  }
  // Add item
  return {
    ...state,
    cartDetails: {
      ...state.cartDetails,
        [cartKey]: {
        ...product,
        stockQuantity: product.stockQuantity ?? product.quantity,
        quantity,
      },
    },
    cartCount: Math.max(0, state.cartCount + quantity),
  };
};

const removeItem = (
  state: Cart = {} as Cart,
  product: Product | null = null,
  quantity = 0,
) => {
  if (quantity <= 0 || !product) return state;

  const cartKey = String(product.id);
  let entry = state?.cartDetails?.[cartKey];

  if (entry) {
    // Remove item
    if (quantity >= entry.quantity) {
      const { [cartKey]: id, ...details } = state.cartDetails;
      return {
        ...state,
        cartDetails: details,
        cartCount: Math.max(0, state.cartCount - entry.quantity),
        totalPrice: Math.max(0),
      };
    }
    // Update item
    else {
      return {
        ...state,
        cartDetails: {
          ...state.cartDetails,
          [cartKey]: {
            ...entry,
            quantity: entry.quantity - quantity,
          },
        },
        cartCount: Math.max(0, state.cartCount - quantity),
      };
    }
  } else {
    return state;
  }
};

const clearCart = () => {
  return initialCartValues;
};

const cartReducer: Reducer<Cart, Action> = (
  state: Cart = {} as Cart,
  action: Action,
) => {
  switch (action.type) {
    case "ADD_ITEM":
      return addItemToCart(state, action.product, action.quantity);
    case "REMOVE_ITEM":
      return removeItem(state, action.product, action.quantity);
    case "CLEAR_CART":
      return clearCart();
    default:
      return state;
  }
};

interface Props {
  currency?: string;
  children: ReactElement | null;
}

// Context + Provider
export const CartContext = React.createContext({} as [Cart, Dispatch<Action>]);

export const CartProvider = ({ currency = "BRL", children = null }: Props) => {
  const [cart, dispatch] = useLocalStorageReducer(
    "cart",
    cartReducer,
    initialCartValues,
  );

  const contextValue = useMemo(
    () =>
      [
        {
          ...cart,
          currency,
        },
        dispatch,
      ] as [Cart, Dispatch<Action>],
    [cart, currency],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};

// Hook
export const useShoppingCart = () => {
  const [cart, dispatch] = useContext(CartContext);

  const addItemToCart = (product: Product, quantity = 1) => {
    dispatch({ type: "ADD_ITEM", product, quantity });
  };

  const removeItem = (product: Product, quantity = 1) =>
    dispatch({ type: "REMOVE_ITEM", product, quantity });

  const clearCart = () =>
    dispatch({ type: "CLEAR_CART", product: {} as Product, quantity: 0 });

  const shoppingCart = {
    ...cart,
    addItemToCart,
    removeItem,
    clearCart,
  };

  return shoppingCart;
};
