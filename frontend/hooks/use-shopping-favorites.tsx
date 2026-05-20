import React, {
  useContext,
  useReducer,
  useMemo,
  Reducer,
  Dispatch,
  ReactElement,
} from "react";
import useLocalStorageReducer from "./use-local-storage-reducer";

// Reducers
const initialFavoritesValues: State = {
  favoritesDetails: {},
  favoritesCount: 0,
};

export interface State {
  favoritesDetails: {
    [key: string]:
      | {
          categories: string[];
          gender: string;
          id: string;
          name: string;
          price: string;
          quantity: number;
          srcImg: string;
          promo: number;
        }
      | { quantity: number; id: string; price: string };
  };
  favoritesCount: number;
}

export interface Product {
  id: string;
  price: string;
  promo: number;
}

export interface Action {
  type: string;
  quantity: number;
  product: Product;
}

const addItemToFavorites = (
  state: State = {} as State,
  product: Product | null = null,
  quantity = 0,
) => {
  if (quantity <= 0 || !product) return state;

  let entry = state?.favoritesDetails?.[product.id];

  // Update item
  if (entry) {
    return {
      ...state,
      favoritesDetails: {
        ...state.favoritesDetails,
        [product.id]: {
          ...entry,
          quantity: entry.quantity + quantity,
        },
      },
      favoritesCount: Math.max(0, state.favoritesCount + quantity),
    };
  }
  // Add item
  return {
    ...state,
    favoritesDetails: {
      ...state.favoritesDetails,
      [product.id]: {
        ...product,
        quantity,
      },
    },
    favoritesCount: Math.max(0, state.favoritesCount + quantity),
  };
};

const removeItem = (
  state: State = {} as State,
  product: Product | null = null,
  quantity = 0,
) => {
  if (quantity <= 0 || !product) return state;

  let entry = state?.favoritesDetails?.[product.id];

  if (entry) {
    // Remove item
    if (quantity >= entry.quantity) {
      const { [product.id]: id, ...details } = state.favoritesDetails;
      return {
        ...state,
        favoritesDetails: details,
        favoritesCount: Math.max(0, state.favoritesCount - entry.quantity),
      };
    }
    // Update item
    else {
      return {
        ...state,
        favoritesDetails: {
          ...state.favoritesDetails,
          [product.id]: {
            ...entry,
            quantity: entry.quantity - quantity,
          },
        },
        favoritesCount: Math.max(0, state.favoritesCount - quantity),
      };
    }
  } else {
    return state;
  }
};

const clearFavorites = () => {
  return initialFavoritesValues;
};

const favoritesReducer: Reducer<State, Action> = (
  state: State = {} as State,
  action: Action,
) => {
  switch (action.type) {
    case "ADD_ITEM":
      return addItemToFavorites(state, action.product, action.quantity);
    case "REMOVE_ITEM":
      return removeItem(state, action.product, action.quantity);
    case "CLEAR_FAVORITES":
      return clearFavorites();
    default:
      return state;
  }
};

interface Props {
  currency?: string;
  children: ReactElement | null;
}

// Context + Provider
export const FavoritesContext = React.createContext(
  {} as [State, Dispatch<Action>],
);

export const FavoritesProvider = ({
  currency = "BRL",
  children = null,
}: Props) => {
  const [favorites, dispatch] = useLocalStorageReducer(
    "favorites",
    favoritesReducer,
    initialFavoritesValues,
  );

  const contextValue = useMemo(
    () =>
      [
        {
          ...favorites,
        },
        dispatch,
      ] as [State, Dispatch<Action>],
    [favorites, currency],
  );

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
};

// Hook
export const useShoppingFavorites = () => {
  const [favorites, dispatch] = useContext(FavoritesContext);

  const addItemToFavorites = (product: Product, quantity = 1) => {
    dispatch({ type: "ADD_ITEM", product, quantity });
  };

  const removeItem = (product: Product, quantity = 1) =>
    dispatch({ type: "REMOVE_ITEM", product, quantity });

  const clearFavorites = () =>
    dispatch({ type: "CLEAR_FAVORITES", product: {} as Product, quantity: 0 });

  const shoppingFavorites = {
    ...favorites,
    addItemToFavorites,
    removeItem,
    clearFavorites,
  };

  return shoppingFavorites;
};
