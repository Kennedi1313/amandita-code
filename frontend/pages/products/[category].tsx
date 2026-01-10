import { useEffect, useState } from 'react';
import Item from '../../components/item';
import Pagination from '@/components/pagination';
import { usePagination } from '@/components/Context/paginationContext';
import { HomeProps, Product } from '@/types/ProductTypes';
import { getCategoriesNoStore, getProductsByCategory } from '@/lib/productClient';
import Loading from '@/components/loading';
const PAGE_SIZE = 8;
const PROMO_PAGE_SIZE = 50;

export default function Home({ products, category, itemsCount }: HomeProps) {
  const [productList, setProductList] = useState<Product[]>(products);
  const [productListSize, setProductListSize] = useState<number>(itemsCount);
  const { currentPage, setCurrentPage } = usePagination();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, category]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProductsByCategory(category, currentPage);
      setProductList(data.content);
      setProductListSize(data.totalElements);
    } catch (error) { }
    finally { setLoading(false) }
  }

  const renderProductList = () => (
    <div>
      <div className="mt-[8.5rem] md:mt-36 md:max-w-screen-lg mx-auto flex items-center justify-center px-2 md:px-0 py-5 my-2">
        <div className="z-30 md:max-w-screen-lg mx-auto center grid lg:grid-cols-4 grid-cols-2 w-full gap-2 gap-y-4 min-h-[57rem]">
          {productList.map((item) => (
            <Item key={item.id} id={item.id} name={item.name} price={item.price} description={item.description} quantity={item.quantity} promo={item.promo} profileImageId={item.profileImageId} />
          ))}
        </div>
      </div>
      <Pagination className="pagination-bar" currentPage={currentPage} totalCount={productListSize} pageSize={category !== 'promo' ? PAGE_SIZE : PROMO_PAGE_SIZE} onPageChange={(page: any) => setCurrentPage(page)} />
    </div>
  )

  const renderEmptyState = () => (
    <div className="mt-36 md:max-w-screen-lg mx-auto flex flex-col items-center justify-center px-1 md:px-0 py-5 my-2">
      <h1>NENHUM PRODUTO CADASTRADO NESSA CATEGORIA</h1>
    </div>
  )

  return (
    <div className="relative">
      {loading ? <Loading/>
        : productList && productListSize > 0 ? renderProductList() 
          : renderEmptyState()}
    </div>
  )
}

export async function getStaticPaths() {
  const data = await getCategoriesNoStore();
  const categories = data.map((category: any) => category.path.split("/").pop());
  return {
    paths: categories.map((category: any) => ({ params: { category } })),
    fallback: false,
  };
}

export const getStaticProps = async ({ params }: { params: { category: string } }) => {
  const { category } = params;
  try {
    //const data = await getProductsByCategoryNoStore(category, 0);
    return { props: { products: [], category, itemsCount: 0 } }
  } catch (err) {
    return { props: { products: [], category, itemsCount: 0 } } }
}