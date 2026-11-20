import { useAuth } from "../../components/Context/authContext";
import { toast } from "react-hot-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import {
  clearGuestCheckoutDraft,
  enableGuestCheckout,
} from "@/lib/guestCheckout";

declare global {
  interface Window {
    google?: any;
  }
}

const safeRedirectPath = (redirect?: string | null) =>
  redirect && redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : "/account";

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
      if (
        !buttonRef.current ||
        !window.google ||
        (!scriptReady && attempts < 1)
      ) {
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
        width: Math.max((buttonRef.current.offsetWidth || 320) + 2, 240),
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
      <div className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-xl border border-gray-300 bg-white p-0 transition hover:border-gray-900">
        <div
          ref={buttonRef}
          className="relative -top-px flex h-10 w-full justify-center"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border border-white"
        />
      </div>
    </>
  );
};

const LoginForm = () => {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));
  const isCheckoutFlow = redirectTo === "/checkout";
  const handleGoogleCredential = useCallback(
    (credential: string) => {
      loginWithGoogle(credential)
        .then((res: any) => {
          clearGuestCheckoutDraft();
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
      {isCheckoutFlow && (
        <>
          <Link
            href="/checkout"
            onClick={enableGuestCheckout}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gray-950 px-4 font-semibold text-white transition hover:bg-gray-800"
          >
            Continuar como convidado
          </Link>
          <div className="relative flex items-center py-1" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="px-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              ou entre com sua conta
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>
        </>
      )}
      <GoogleLoginButton onCredential={handleGoogleCredential} />
    </div>
  );
};

const Login = () => {
  return (
    <main className="mx-auto mt-16 min-h-[70vh] px-4 py-6 md:container md:mt-28 md:px-6 md:py-12 xl:max-w-screen-xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-8 md:grid-cols-[1fr_420px]">
          <div className="hidden md:block">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Sua conta
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight text-gray-950">
              Acesse seus pedidos com segurança.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-7 text-gray-600">
              Entre para acompanhar seus pedidos e acessar seus dados salvos.
            </p>
            <div className="mt-8 space-y-4 text-gray-700">
              {[
                "Acompanhe o histórico de compras",
                "Consulte os detalhes e o envio dos pedidos",
                "Seus dados ficam protegidos na sua conta",
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
              Acesso seguro
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
              Entrar na sua conta
            </h2>
            <p className="mt-3 text-gray-600">
              Use sua conta Google para abrir o histórico e os dados salvos.
            </p>
            <div className="my-7 border-t border-gray-100" />
            <LoginForm />
            <p className="mt-6 text-center text-xs leading-5 text-gray-500">
              Ao entrar, você poderá consultar sua conta e seus pedidos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
