import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  useDisclosure,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import CardWithImageForSelling from "./ProductCardForSelling.jsx";
import { useEffect, useState } from "react";
import { getProducts } from "../../services/product-client.js";
import { errorNotification } from "../../services/notification.js";

const AddIcon = () => "+";
const CloseIcon = () => "x";

const SellProductDrawer = ({ fetchProducts }) => {
  const [products, setProducts] = useState([]);
  const [productsWithSearch, setProductsWithSearch] = useState([products]);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);
  const { isOpen, onOpen, onClose } = useDisclosure();
  return <></>;
};

export default SellProductDrawer;
