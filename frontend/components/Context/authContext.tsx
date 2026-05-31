import { createContext, useContext, useEffect, useState } from "react";
import { login as performLogin, loginWithGoogle as performGoogleLogin } from "../../lib/client";
import * as jwtDecode from "jwt-decode";
interface UserProps {
  username?: string;
  roles: [];
}

const AuthContext = createContext({} as any);

const normalizeAccessToken = (token?: string | null) => {
  if (!token) return "";
  return token.replace(/^Bearer\s+/i, "").trim();
};

const AuthProvider = ({ children }: any) => {
  const [customer, setCustomer] = useState(null as any);
  const [isClient, setIsClient] = useState(false);

  const setCustomerFromToken = () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = normalizeAccessToken(localStorage.getItem("access_token"));
    if (token) {
      try {
        localStorage.setItem("access_token", token);
        const tokenDecoded = jwtDecode.default<any>(token);
        setCustomer({
          username: tokenDecoded?.sub,
          roles: tokenDecoded?.scopes,
        });
      } catch {
        localStorage.removeItem("access_token");
        setCustomer(null);
      }
    }
  };

  useEffect(() => {
    setIsClient(true);
    setCustomerFromToken();
  }, []);

  const login = async (usernameAndPassword: any) => {
    return new Promise((resolve, reject) => {
      performLogin(usernameAndPassword)
        .then((res) => {
          const jwtToken = normalizeAccessToken(
            res.headers["authorization"] || res.data?.token,
          );
          localStorage.setItem("access_token", jwtToken);

          const decodedToken = jwtDecode.default<any>(jwtToken);

          setCustomer({
            username: decodedToken.sub,
            roles: decodedToken.scopes,
          });
          resolve(res);
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  };

  const loginWithGoogle = async (credential: string) => {
    return new Promise((resolve, reject) => {
      performGoogleLogin(credential)
        .then((res) => {
          const jwtToken = normalizeAccessToken(
            res.headers["authorization"] || res.data?.token,
          );
          localStorage.setItem("access_token", jwtToken);

          const decodedToken = jwtDecode.default<any>(jwtToken);

          setCustomer({
            username: decodedToken.sub,
            roles: decodedToken.scopes,
          });
          resolve(res);
        })
        .catch((err: any) => {
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
      const { exp: expiration } = jwtDecode.default<any>(token);
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
    <>
      {isClient ? (
        <AuthContext.Provider
          value={{
            customer,
            login,
            loginWithGoogle,
            logOut,
            isCustomerAuthenticated,
            setCustomerFromToken,
          }}
        >
          {children}
        </AuthContext.Provider>
      ) : (
        ""
      )}
    </>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
