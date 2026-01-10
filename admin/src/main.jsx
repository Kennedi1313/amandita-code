import React from 'react'
import ReactDOM from 'react-dom/client'
import Customer from './Customer.jsx'
import {ChakraProvider, Text} from '@chakra-ui/react'
import { createStandaloneToast } from '@chakra-ui/toast'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./components/login/Login.jsx";
import Signup from "./components/signup/Signup";
import AuthProvider from "./components/context/AuthContext.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import './index.css'
import Home from "./Home.jsx";
import Product from "./Product.jsx";
import Sell from "./Sell.jsx";
import {FavoritesProvider} from "./hooks/use-shopping-favorites.jsx";
import { PaginationProvider } from './components/context/PaginationContext.jsx'

const { ToastContainer } = createStandaloneToast();

const router = createBrowserRouter([
    {
        path: "/",
        element: <Login />
    },
    {
        path: "/signup",
        element: <Signup />
    },
    {
        path: "dashboard",
        element: <ProtectedRoute><Home/></ProtectedRoute>
    },
    {
        path: "dashboard/customers",
        element: <ProtectedRoute><Customer /></ProtectedRoute>
    },
    {
        path: "dashboard/products",
        element: <ProtectedRoute><Product /></ProtectedRoute>
    },
    {
        path: "dashboard/sell",
        element: <ProtectedRoute><Sell /></ProtectedRoute>
    }
])

ReactDOM
    .createRoot(document.getElementById('root'))
    .render(
        <React.StrictMode>
            <ChakraProvider>
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
    )
