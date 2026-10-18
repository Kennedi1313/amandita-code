import { useAuth } from "../../components/Context/authContext";
import { toast } from "react-hot-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    google?: any;
  }
}

const safeRedirectPath = (redirect?: string | null) =>
  redirect && redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : "/checkout";

const GoogleLoginButton = ({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!googleClientId || !buttonRef.current) return;

    let attempts = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const renderGoogleButton = () => {
      if (!buttonRef.current || !window.google || (!scriptReady && attempts < 1)) {
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: any) => {
          if (response?.credential) onCredential(response.credential);
        },
      });
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        width: buttonRef.current.offsetWidth || 320,
        locale: "pt-BR",
      });
      return true;
    };

    if (!renderGoogleButton()) {
      timer = setInterval(() => {
        attempts += 1;
        if (renderGoogleButton() || attempts >= 20) {
          if (timer) clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [googleClientId, onCredential, scriptReady]);
  if (!googleClientId)
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">
        Login com Google ainda não configurado nesta loja.
      </p>
    );
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        async
        defer
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div
        ref={buttonRef}
        className="flex min-h-[44px] w-full justify-center"
      />
    </>
  );
};

const LoginForm = () => {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));
  const handleGoogleCredential = useCallback(
    (credential: string) => {
      loginWithGoogle(credential)
        .then((res: any) => {
          const profile = res.data?.customerDTO;
          const address = profile?.addresses?.[0];
          const needsProfile =
            !profile?.phone ||
            !profile?.cpf ||
            !address?.zip ||
            !address?.street ||
            !address?.number ||
            !address?.district ||
            !address?.city;
          router.push(
            needsProfile
              ? `/account?redirect=${encodeURIComponent(redirectTo)}`
              : redirectTo,
          );
        })
        .catch((err: any) =>
          toast.error(
            err.response?.data?.message ||
              err.response?.data ||
              "Não foi possível entrar com Google.",
          ),
        );
    },
    [loginWithGoogle, redirectTo, router],
  );
  return (
    <div className="flex w-full flex-col gap-4">
      <GoogleLoginButton onCredential={handleGoogleCredential} />
      <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 text-left">
        <span className="mt-0.5 text-lg" aria-hidden="true">
          ✓
        </span>
        <p className="text-sm leading-5 text-gray-600">
          Sua conta é criada automaticamente na primeira entrada. Depois você só
          completa contato e endereço para finalizar.
        </p>
      </div>
    </div>
  );
};

const Login = () => {
  return (
    <main className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[70vh]">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 md:grid-cols-[1fr_420px]">
        <div className="hidden md:block">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
            Quase lá
          </p>
          <h1 className="max-w-xl text-4xl font-bold leading-tight text-gray-950">
            Entre para continuar sua compra com tranquilidade.
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-7 text-gray-600">
            Um único acesso para salvar seus dados, acompanhar pedidos e voltar
            ao carrinho quando quiser.
          </p>
          <div className="mt-8 space-y-4 text-gray-700">
            {[
              "Finalize pedidos sem repetir seus dados",
              "Acompanhe seu histórico de compras",
              "Tenha seus dados protegidos pelo Google",
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-sm text-white">
                  ✓
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
            Sua conta
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
            Entrar ou criar conta
          </h2>
          <p className="mt-3 text-gray-600">
            Use sua conta Google para continuar. Não precisa criar senha.
          </p>
          <div className="my-7 border-t border-gray-100" />
          <LoginForm />
          <p className="mt-6 text-center text-xs leading-5 text-gray-500">
            Ao continuar, você concorda com os termos da loja. Seus dados são
            usados apenas para processar e acompanhar seu pedido.
          </p>
        </div>
      </div>
    </div>
    </main>
  );
};

export default Login;
