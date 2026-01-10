import {
    Button,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    useDisclosure
} from "@chakra-ui/react";
import CreateProductForm from "../shared/CreateProductForm.jsx";
import { FiPlusCircle } from "react-icons/fi";

const AddIcon = () => "+";
const CloseIcon = () => "x";

const CreateProductDrawer = ({ fetchProducts }) => {
    const { isOpen, onOpen, onClose } = useDisclosure()
    return <>
        <Button
            backgroundColor="#ebe5fc"
            color={"#5f5482"}
            leftIcon={<FiPlusCircle/>}
            onClick={onOpen}
        >
            Cadastrar Produto
        </Button>
        <Drawer isOpen={isOpen} onClose={onClose} size={"xl"}>
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader>Cadastrar Novo Produto</DrawerHeader>

                <DrawerBody>
                    <CreateProductForm
                        fetchProducts={fetchProducts}
                    />
                </DrawerBody>
            </DrawerContent>
        </Drawer>
        </>

}

export default CreateProductDrawer;