import React from "react";
import ReactDOM from "react-dom/client";
import Customer from "./Customer.jsx";
import {
  ChakraProvider,
  Text,
  createStandaloneToast,
  extendTheme,
} from "@chakra-ui/react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./components/login/Login.jsx";
import Signup from "./components/signup/Signup";
import AuthProvider from "./components/context/AuthContext.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import "./index.css";
import Home from "./Home.jsx";
import Product from "./Product.jsx";
import StoreSettings from "./StoreSettings.jsx";
import PlanBilling from "./PlanBilling.jsx";
import Categories from "./Categories.jsx";
import Profile from "./Profile.jsx";
import { FavoritesProvider } from "./hooks/use-shopping-favorites.jsx";
import { PaginationProvider } from "./components/context/PaginationContext.jsx";

const { ToastContainer } = createStandaloneToast();

const theme = extendTheme({
  colors: {
    brand: {
      50: "#f0f7e8",
      100: "#e4f2d5",
      200: "#cce7ad",
      300: "#a6d36c",
      400: "#81c44c",
      500: "#327449",
      600: "#1f633c",
      700: "#174b31",
      800: "#103d2b",
      900: "#082f1e",
    },
  },
  fonts: {
    heading: "Inter, ui-sans-serif, system-ui, sans-serif",
    body: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
      },
      "::selection": {
        bg: "brand.100",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "lg",
        fontWeight: "semibold",
        transition: "all 160ms ease",
      },
      defaultProps: {
        colorScheme: "brand",
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: "brand.500",
      },
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "dashboard",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "dashboard/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: "dashboard/customers",
    element: (
      <ProtectedRoute>
        <Customer />
      </ProtectedRoute>
    ),
  },
  {
    path: "dashboard/products",
    element: (
      <ProtectedRoute>
        <Product />
      </ProtectedRoute>
    ),
  },
      {
        path: "dashboard/store",
        element: (
          <ProtectedRoute>
            <StoreSettings section="store" />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/payments",
        element: (
          <ProtectedRoute>
            <StoreSettings section="payments" />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/plan",
        element: (
          <ProtectedRoute>
            <PlanBilling />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/shipping",
        element: (
          <ProtectedRoute>
            <StoreSettings section="shipping" />
          </ProtectedRoute>
        ),
      },
  {
    path: "dashboard/categories",
    element: (
      <ProtectedRoute>
        <Categories />
      </ProtectedRoute>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <FavoritesProvider>
        <AuthProvider>
          <PaginationProvider>
            <RouterProvider router={router} />
          </PaginationProvider>
        </AuthProvider>
        <ToastContainer />
      </FavoritesProvider>
    </ChakraProvider>
  </React.StrictMode>,
);
