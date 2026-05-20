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

  let entry = state?.cartDetails?.[product.id];

  // Update item
  if (entry) {
    return {
      ...state,
      cartDetails: {
        ...state.cartDetails,
        [product.id]: {
          ...entry,
          quantity: entry.quantity + quantity,
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
      [product.id]: {
        ...product,
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

  let entry = state?.cartDetails?.[product.id];

  if (entry) {
    // Remove item
    if (quantity >= entry.quantity) {
      const { [product.id]: id, ...details } = state.cartDetails;
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
          [product.id]: {
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
