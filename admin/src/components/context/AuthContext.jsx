import { createContext, useContext, useEffect, useState } from "react";
import {
  login as performLogin,
  loginWithGoogle as performGoogleLogin,
} from "../../services/client.js";
import jwtDecode from "jwt-decode";

const AuthContext = createContext({});

const normalizeAccessToken = (token) =>
  token ? token.replace(/^Bearer\s+/i, "").trim() : "";

const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);

  const applyToken = (token) => {
    const normalizedToken = normalizeAccessToken(token);
    if (normalizedToken) {
      try {
        localStorage.setItem("access_token", normalizedToken);
        const decodedToken = jwtDecode(normalizedToken);
        setCustomer({
          username: decodedToken.sub,
          roles: decodedToken.scopes,
        });
      } catch {
        localStorage.removeItem("access_token");
        setCustomer(null);
      }
    }
  };

  const setCustomerFromToken = () => {
    applyToken(localStorage.getItem("access_token"));
  };
  useEffect(() => {
    setCustomerFromToken();
  }, []);

  useEffect(() => {
    const allowedPortalOrigin = new URL(
      import.meta.env.VITE_PORTAL_URL || "http://localhost:5174",
    ).origin;

    const handleMessage = (event) => {
      if (event.origin !== allowedPortalOrigin) {
        return;
      }
      if (event.data?.type !== "MOSTRA_DIGITAL_ADMIN_TOKEN") {
        return;
      }
      applyToken(event.data.token);
      window.history.replaceState({}, "", window.location.pathname);
      window.location.href = "/dashboard";
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const login = async (usernameAndPassword) => {
    return new Promise((resolve, reject) => {
      performLogin(usernameAndPassword)
        .then((res) => {
          const jwtToken = res.headers["authorization"];
          applyToken(jwtToken);
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };

  const loginWithGoogle = async (credential) => {
    return new Promise((resolve, reject) => {
      performGoogleLogin(credential)
        .then((res) => {
          applyToken(res.headers["authorization"]);
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };

  const logOut = () => {
    localStorage.removeItem("access_token");
    setCustomer(null);
  };

  const isCustomerAuthenticated = () => {
    const token = normalizeAccessToken(localStorage.getItem("access_token"));
    if (!token) {
      return false;
    }
    try {
      localStorage.setItem("access_token", token);
      const { exp: expiration } = jwtDecode(token);
      if (Date.now() > expiration * 1000) {
        logOut();
        return false;
      }
    } catch {
      logOut();
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        login,
        loginWithGoogle,
        logOut,
        isCustomerAuthenticated,
        setCustomerFromToken,
        applyToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
