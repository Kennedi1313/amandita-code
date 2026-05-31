const Cart = () => null;

export const getServerSideProps = async () => ({
  redirect: {
    destination: "/checkout",
    permanent: false,
  },
});

export default Cart;
