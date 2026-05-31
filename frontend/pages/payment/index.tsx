const Payment = () => null;

export const getServerSideProps = async () => ({
  redirect: {
    destination: "/checkout",
    permanent: false,
  },
});

export default Payment;
