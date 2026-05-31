import { Formik, Form, useField } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../components/Context/authContext";
import { toast } from "react-hot-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    google?: any;
  }
}

const safeRedirectPath = (redirect?: string | null) => {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/checkout";
  }
  return redirect;
};

const MyTextInput = ({ label, ...props }: any) => {
  // useField() returns [formik.getFieldProps(), formik.getFieldMeta()]
  // which we can spread on <input>. We can use field meta to show an error
  // message if the field is invalid and it has been touched (i.e. visited)
  const [field, meta] = useField(props);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={props.id || props.name}>{label}</label>
      <input
        className="border-solid border-[1px] border-gray-300 p-2 rounded-md"
        {...field}
        {...props}
      />
      {meta.touched && meta.error ? (
        <span className="font-bold text-red-500">{meta.error}</span>
      ) : null}
    </div>
  );
};

const LoginForm = () => {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));

  const handleGoogleCredential = useCallback((credential: string) => {
    loginWithGoogle(credential)
      .then(() => {
        router.push(redirectTo);
      })
      .catch((err: any) => {
        console.log(err);
        toast.error(
          err.response?.data?.message ||
            err.response?.data ||
            "Não foi possível entrar com Google.",
        );
      });
  }, [loginWithGoogle, redirectTo, router]);

  return (
    <Formik
      validateOnMount={true}
      validationSchema={Yup.object({
        username: Yup.string()
          .email("Email tem um formato inválido")
          .required("Obrigatório"),
        password: Yup.string().required("Obrigatório"),
      })}
      initialValues={{ username: "", password: "" }}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(true);
        login(values)
          .then((res: any) => {
            router.push(redirectTo);
          })
          .catch((err: any) => {
            console.log(err);
            toast.error(
              "Usuário ou senha incorretos! Em caso de dúvida, entre em contato conosco pelo Whatsapp.",
            );
          })
          .finally(() => {
            setSubmitting(false);
          });
      }}
    >
      {({ isValid, isSubmitting }) => (
        <Form className="flex">
          <div className="flex flex-col gap-4 w-full m-auto">
            <MyTextInput
              label={"Email"}
              name={"username"}
              type={"email"}
              placeholder={"exemplo@exemplo.com"}
            />
            <MyTextInput
              label={"Senha"}
              name={"password"}
              type={"password"}
              placeholder={"Digite sua senha"}
            />

            <button
              className="rounded-md px-2 py-4 bg-black-1000 w-full text-white font-bold disabled:opacity-50"
              type={"submit"}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm text-gray-500">ou</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <GoogleLoginButton onCredential={handleGoogleCredential} />
            <Link className="text-center font-semibold text-black-1000 underline" href={"/signup"}>
              Criar minha conta
            </Link>
          </div>
        </Form>
      )}
    </Formik>
  );
};

const GoogleLoginButton = ({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!scriptReady || !googleClientId || !window.google || !buttonRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response: any) => {
        if (response?.credential) {
          onCredential(response.credential);
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "signin_with",
      width: buttonRef.current.offsetWidth || 320,
      locale: "pt-BR",
    });
  }, [googleClientId, onCredential, scriptReady]);

  if (!googleClientId) {
    return (
      <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">
        Login com Google ainda não configurado nesta loja.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        async
        defer
        onLoad={() => setScriptReady(true)}
      />
      <div ref={buttonRef} className="flex min-h-[44px] w-full justify-center" />
    </>
  );
};

const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer } = useAuth();

  useEffect(() => {
    if (customer) {
      router.push(safeRedirectPath(searchParams.get("redirect")));
    }
  }, [customer, router, searchParams]);

  return (
    <div className="mt-20 md:mt-36 flex-col md:flex-row">
      <div className="flex items-center justify-center px-3">
        <div className="w-full max-w-md">
          <div className="bg-white p-6 md:p-8 rounded-md mt-10 mx-2 border border-gray-100">
            <p className="text-sm uppercase tracking-wide text-gray-500">
              Sua conta
            </p>
            <h1 className="text-3xl font-bold mt-1">Entrar na loja</h1>
            <p className="mt-2 mb-6 text-gray-600">
              Acesse para finalizar compras, revisar seus dados e acompanhar pedidos.
            </p>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
