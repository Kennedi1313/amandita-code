import {useAuth} from "../context/AuthContext.jsx";
import {useNavigate} from "react-router-dom";
import {useEffect} from "react";
import {Flex, Heading, Image, Link, Stack, Text} from "@chakra-ui/react";
import CreateCustomerForm from "../shared/CreateCustomerForm.jsx";

const Signup = () => {
    const { customer, setCustomerFromToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (customer) {
            navigate("/dashboard/customers");
        }
    })

    return (
        <Stack minH={'100vh'}  backgroundColor={'#5f5482'} direction={{base: 'column', md: 'row'}}>
            
            <Flex p={8} flex={1} alignItems={'center'} justifyContent={'center'}>
                <Stack spacing={4} w={'full'} maxW={'md'}>
                    <Image 
                        src="logo.png" 
                        alt="Logo" 
                        boxSize="150px" 
                        objectFit="contain" 
                        alignSelf="center"
                    />
                    <Stack spacing={4} w={'full'} maxW={'md'} backgroundColor={'white'} color={"#5f5482"} padding={'2rem'} rounded={'lg'}>
                        <Heading fontSize={'2xl'} mb={15}>Faça seu cadastro</Heading>
                        <CreateCustomerForm onSuccess={(token) => {
                            localStorage.setItem("access_token", token)
                            setCustomerFromToken()
                            navigate("/dashboard");
                        }}/>
                        <Link color={"blue.500"} href={"/"}>
                            Já possui uma conta? Faça login aqui.
                        </Link>
                    </Stack>
                </Stack>
            </Flex>
        </Stack>
    );
}

export default Signup;