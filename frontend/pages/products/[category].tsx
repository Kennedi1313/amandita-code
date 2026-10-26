import { useCallback, useEffect, useState } from "react";
import Item from "../../components/item";
import Pagination from "@/components/pagination";
import { usePagination } from "@/components/Context/paginationContext";
import { HomeProps, Product } from "@/types/ProductTypes";
import { getProductsByCategory } from "@/lib/productClient";
import Loading from "@/components/loading";
const PAGE_SIZE = 8;
const PROMO_PAGE_SIZE = 50;

export default function Home({ products, category, itemsCount }: HomeProps) {
  const [productList, setProductList] = useState<Product[]>(products);
  const [productListSize, setProductListSize] = useState<number>(itemsCount);
  const { currentPage, setCurrentPage } = usePagination();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setCurrentPage(0);
  }, [category, setCurrentPage]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProductsByCategory(category, currentPage);
      setProductList(data.content);
      setProductListSize(data.totalElements);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [category, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const renderProductList = () => (
    <div>
      <div className="mt-20 md:mt-36 md:max-w-screen-lg mx-auto flex items-start justify-center px-2 md:px-0 py-5 my-2">
        <div className="z-30 md:max-w-screen-lg mx-auto grid w-full grid-cols-2 content-start items-start gap-2 gap-y-4 lg:grid-cols-4">
          {productList.map((item) => (
            <Item
              key={item.id}
              id={item.id}
              name={item.name}
              price={item.price}
              description={item.description}
              quantity={item.quantity}
              promo={item.promo}
              profileImageId={item.profileImageId}
              variations={item.variations}
            />
          ))}
        </div>
      </div>
      <Pagination
        className="pagination-bar"
        currentPage={currentPage}
        totalCount={productListSize}
        pageSize={category !== "promo" ? PAGE_SIZE : PROMO_PAGE_SIZE}
        onPageChange={(page: any) => setCurrentPage(page)}
      />
    </div>
  );

  const renderEmptyState = () => (
    <div className="mt-36 md:max-w-screen-lg mx-auto flex flex-col items-center justify-center px-1 md:px-0 py-5 my-2">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">
          Novidades em breve
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Estamos preparando os produtos desta vitrine. Volte em breve
          para conferir.
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {loading ? (
        <Loading />
      ) : productList && productListSize > 0 ? (
        renderProductList()
      ) : (
        renderEmptyState()
      )}
    </div>
  );
}

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export const getStaticProps = async ({
  params,
}: {
  params: { category: string };
}) => {
  const { category } = params;
  try {
    //const data = await getProductsByCategoryNoStore(category, 0);
    return { props: { products: [], category, itemsCount: 0 } };
  } catch (err) {
    return { props: { products: [], category, itemsCount: 0 } };
  }
};
