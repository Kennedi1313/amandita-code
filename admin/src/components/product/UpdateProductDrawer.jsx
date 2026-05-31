import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import UpdateProductForm from "./UpdateProductForm.jsx";
import { FiEdit } from "react-icons/fi";

const UpdateProductDrawer = ({
  fetchProducts,
  initialValues,
  productId,
  buttonProps = {},
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Button
        colorScheme="blue"
        width={"full"}
        rounded={"md"}
        leftIcon={<FiEdit />}
        _hover={{
          transform: "translateY(-2px)",
          boxShadow: "lg",
        }}
        onClick={onOpen}
        {...buttonProps}
      >
        Editar
      </Button>
      <Drawer isOpen={isOpen} onClose={onClose} size={"xl"}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Atualizar Produto</DrawerHeader>

          <DrawerBody>
            <UpdateProductForm
              fetchProducts={fetchProducts}
              initialValues={initialValues}
              productId={productId}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default UpdateProductDrawer;
