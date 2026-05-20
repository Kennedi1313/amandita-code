import React, {
  useContext,
  useReducer,
  useMemo,
  Reducer,
  Dispatch,
  ReactElement,
} from "react";
import useLocalStorageReducer from "./use-local-storage-reducer.jsx";

// Reducers
const initialFavoritesValues = {
  favoritesDetails: {},
  favoritesCount: 0,
  totalPrice: 0,
  currency: "BRL",
};

const addItemToFavorites = (state = {}, product = null, quantity = 0) => {
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
      totalPrice: Math.max(state.totalPrice + product.price * quantity),
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
    totalPrice: Math.max(state.totalPrice + product.price * quantity),
  };
};

const removeItem = (state = {}, product = null, quantity = 0) => {
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
        totalPrice: Math.max(
          0,
          state.totalPrice - product.price * entry.quantity,
        ),
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
        totalPrice: Math.max(0, state.totalPrice - product.price * quantity),
      };
    }
  } else {
    return state;
  }
};

const clearFavorites = () => {
  return initialFavoritesValues;
};

const favoritesReducer = (state = {}, action) => {
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

// Context + Provider
export const FavoritesContext = React.createContext({});

export const FavoritesProvider = ({ currency = "BRL", children = null }) => {
  const [favorites, dispatch] = useLocalStorageReducer(
    "favorites",
    favoritesReducer,
    initialFavoritesValues,
  );

  const contextValue = useMemo(
    () => [
      {
        ...favorites,
        currency,
      },
      dispatch,
    ],
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
  const addItemToFavorites = (product, quantity = 1) => {
    dispatch({ type: "ADD_ITEM", product, quantity });
  };

  const removeItem = (product, quantity = 1) =>
    dispatch({ type: "REMOVE_ITEM", product, quantity });

  const clearFavorites = () =>
    dispatch({ type: "CLEAR_FAVORITES", product: {}, quantity: 0 });

  const shoppingFavorites = {
    ...favorites,
    addItemToFavorites,
    removeItem,
    clearFavorites,
  };

  return shoppingFavorites;
};
