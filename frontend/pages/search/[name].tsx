import { useEffect, useState } from 'react';
import Item from '../../components/item';
import Pagination from '@/components/pagination';
import { usePagination } from '@/components/Context/paginationContext';
import { useRouter } from 'next/router';
import { Product } from '@/types/ProductTypes';
import { getProductsByName } from '@/lib/productClient';

const PAGE_SIZE = 8;


export default function Search() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [productListSize, setProductListSize] = useState<number>(0);
  const { currentPage, setCurrentPage } = usePagination();
  const router = useRouter();
  const query = router.query.name as string;

  useEffect(() => {
    fetchProducts();
  }, [currentPage, query]);

  const fetchProducts = async () => {
    try {
      if (query) {
        const data = await getProductsByName(query, currentPage);
        setProductList(data.content);
        setProductListSize(data.totalElements);
      }
    } catch (error) {  }
  }

  const renderProductList = () => (
    <div>
      <div className="mt-[8.5rem] md:mt-36 md:max-w-screen-lg mx-auto flex flex-col gap-6 items-center justify-center px-1 md:px-0 py-5 my-2">
        <h1>Resultados encontrados para a sua busca: {query}.</h1>
        <div className="center grid lg:grid-cols-4 grid-cols-2 w-full gap-1 gap-y-6">
          {productList.map((item) => (
            <Item key={item.id} id={item.id} name={item.name} price={item.price} description={item.description} quantity={item.quantity} promo={item.promo} profileImageId={item.profileImageId} />
          ))}
        </div>
      </div>
      <Pagination className="pagination-bar" currentPage={currentPage} totalCount={productListSize} pageSize={PAGE_SIZE} onPageChange={(page: any) => setCurrentPage(page)} />
    </div>
  )

  const renderEmptyState = () => (
    <div className="mt-36 md:max-w-screen-lg mx-auto flex flex-col items-center justify-center px-1 md:px-0 py-5 my-2">
      <h1>Que pena 🙁 Não encontramos nenhum produto para a sua busca: {query} <br />Que tal conferir nossas categorias ou buscar um outro termo?</h1>
    </div>
  )

  return productListSize > 0 ? renderProductList() : renderEmptyState();
}
