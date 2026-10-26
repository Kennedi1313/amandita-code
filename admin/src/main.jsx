import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import {
  ChakraProvider,
  Text,
  createStandaloneToast,
  extendTheme,
} from "@chakra-ui/react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AuthProvider from "./components/context/AuthContext.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import "./index.css";
import { FavoritesProvider } from "./hooks/use-shopping-favorites.jsx";
import { PaginationProvider } from "./components/context/PaginationContext.jsx";

const Customer = lazy(() => import("./Customer.jsx"));
const Home = lazy(() => import("./Home.jsx"));
const Product = lazy(() => import("./Product.jsx"));
const StoreSettings = lazy(() => import("./StoreSettings.jsx"));
const PlanBilling = lazy(() => import("./PlanBilling.jsx"));
const Categories = lazy(() => import("./Categories.jsx"));
const Profile = lazy(() => import("./Profile.jsx"));
const Login = lazy(() => import("./components/login/Login.jsx"));
const Signup = lazy(() => import("./components/signup/Signup.jsx"));

const withLoadingFallback = (element) => (
  <Suspense fallback={<Text p={8}>Carregando…</Text>}>
    {element}
  </Suspense>
);

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
    element: withLoadingFallback(<Login />),
  },
  {
    path: "/signup",
    element: withLoadingFallback(<Signup />),
  },
  {
    path: "dashboard",
    element: withLoadingFallback(
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>,
    ),
  },
  {
    path: "dashboard/profile",
    element: withLoadingFallback(
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>,
    ),
  },
  {
    path: "dashboard/customers",
    element: withLoadingFallback(
      <ProtectedRoute>
        <Customer />
      </ProtectedRoute>,
    ),
  },
  {
    path: "dashboard/products",
    element: withLoadingFallback(
      <ProtectedRoute>
        <Product />
      </ProtectedRoute>,
    ),
  },
      {
        path: "dashboard/store",
        element: withLoadingFallback(
          <ProtectedRoute>
            <StoreSettings section="store" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "dashboard/payments",
        element: withLoadingFallback(
          <ProtectedRoute>
            <StoreSettings section="payments" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "dashboard/plan",
        element: withLoadingFallback(
          <ProtectedRoute>
            <PlanBilling />
          </ProtectedRoute>,
        ),
      },
      {
        path: "dashboard/shipping",
        element: withLoadingFallback(
          <ProtectedRoute>
            <StoreSettings section="shipping" />
          </ProtectedRoute>,
        ),
      },
  {
    path: "dashboard/categories",
    element: withLoadingFallback(
      <ProtectedRoute>
        <Categories />
      </ProtectedRoute>,
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
