import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";
import {getCustomers, login as performLogin} from "../../lib/client";
import * as jwtDecode from "jwt-decode";
interface UserProps {
    username?: string,
    roles: []
}

const AuthContext = createContext({} as any);

const AuthProvider = ({ children }: any) => {

    if (typeof window == 'undefined') {
        // Perform localStorage action
        return null;
    }

    const [customer, setCustomer] = useState(null as any);
    const [isClient, setIsClient] = useState(false)
    const setCustomerFromToken = () => {
        let token = localStorage.getItem("access_token");
        if (token) {
            let tokenDecoded = jwtDecode.default<any>(token);
            setCustomer({
                username: tokenDecoded?.sub,
                roles: tokenDecoded?.scopes
            })
        }
    }
    useEffect(() => {
        setIsClient(true)
        setCustomerFromToken()
    }, [])


    const login = async (usernameAndPassword: any) => {
        return new Promise((resolve, reject) => {
            performLogin(usernameAndPassword).then(res => {
                const jwtToken = res.headers["authorization"];
                localStorage.setItem("access_token", jwtToken);

                const decodedToken = jwtDecode.default<any>(jwtToken);

                setCustomer({
                    username: decodedToken.sub,
                    roles: decodedToken.scopes
                })
                resolve(res);
            }).catch((err: any) => {
                reject(err);
            })
        })
    }

    const logOut = () => {
        localStorage.removeItem("access_token")
        setCustomer(null)
    }

    const isCustomerAuthenticated = () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            return false;
        }
        const { exp: expiration } = jwtDecode.default<any>(token);
        if (Date.now() > expiration * 1000) {
            logOut()
            return false;
        }
        return true;
    }

    return (<>{isClient ?
        <AuthContext.Provider value={{
            customer,
            login,
            logOut,
            isCustomerAuthenticated,
            setCustomerFromToken
        }}>
            {children}
        </AuthContext.Provider>
        : ""}
        </>
    )
}

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;