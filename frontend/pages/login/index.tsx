import {Formik, Form, useField} from "formik";
import * as Yup from 'yup';
import {useAuth} from "../../components/Context/authContext";
import { toast } from 'react-hot-toast';
import {useEffect} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from 'next/navigation'
import Menu from "@/components/menu";

const MyTextInput = ({label, ...props} : any) => {
    // useField() returns [formik.getFieldProps(), formik.getFieldMeta()]
    // which we can spread on <input>. We can use field meta to show an error
    // message if the field is invalid and it has been touched (i.e. visited)
    const [field, meta] = useField(props);
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={props.id || props.name}>{label}</label>
            <input className="border-solid border-[1px] border-gray-300 p-2 rounded-md" {...field} {...props} />
            {meta.touched && meta.error ? (
                <span className="font-bold text-red-500">{meta.error}</span>
            ) : null}
        </div>
    );
};

const LoginForm = () => {
    const { login } = useAuth();
    const router = useRouter()
    return (
        <Formik
            validateOnMount={true}
            validationSchema={
                Yup.object({
                    username: Yup.string()
                        .email("Email tem um formato inválido")
                        .required("Obrigatório"),
                    password: Yup.string()
                        .required("Obrigatório")
                })
            }
            initialValues={{username: '', password: ''}}
            onSubmit={(values, {setSubmitting}) => {
                setSubmitting(true);
                login(values).then((res: any) => {
                    router.push("/cart");
                }).catch((err: any) => {
                    console.log(err)
                    toast.error(
                        "Usuário ou senha incorretos! Em caso de dúvida, entre em contato conosco pelo Whatsapp."
                    )
                }).finally(() => {
                    setSubmitting(false);
                })
            }}>

            {({isValid, isSubmitting}) => (
                <Form className="flex">
                    <div className="flex flex-col p-4 gap-2 w-full m-auto">
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
                            className="rounded-md px-2 py-4 bg-green-500 w-full mt-5 text-white font-bold"
                            type={"submit"}
                            disabled={!isValid || isSubmitting}>
                            Entrar
                        </button>
                        <Link className="text-blue-600" href={"/signup"}>
                            Não possui uma conta ainda? Faça seu cadastro aqui.
                        </Link>
                    </div>
                </Form>
            )}

        </Formik>
    )
}

const Login = () => {
    const router = useRouter()
    const { customer } = useAuth();

    useEffect(() => {
        if (customer) {
            router.push("/cart")
        }
    })

    return (
        <div className="md:mt-48 mt-[8.5rem] flex-col md:flex-row">
            <div className="flex items-center justify-center">
                <div className="w-full max-w-md">

                    <div className="bg-white p-[2rem] rounded-lg mt-10 mx-2">
                        <h1 className="text-3xl font-bold mb-5">Entrar na sua conta</h1>
                        <LoginForm />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;