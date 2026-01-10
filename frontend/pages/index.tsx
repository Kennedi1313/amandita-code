import Item from '../components/item';
import Head from 'next/head';
import Image from 'next/image'
import { HomeProps, Product } from '@/types/ProductTypes';
import { getProductsPaginated, getProductsPaginatedNoStore } from '@/lib/productClient';
import useStoreInfo from '@/hooks/use-store-info';
import { useEffect, useState } from 'react';

export default function Home({ products, itemsCount }: HomeProps) {
  const [productList, setProductList] = useState<Product[]>(products);
  const [productListSize, setProductListSize] = useState<number>(itemsCount);
  const [hasMounted, setHasMounted] = useState(false);
  const fetchProducts = async () => {
      try {
        const data = await getProductsPaginated(0, "");
        setProductList(data.content);
        setProductListSize(data.totalElements);
        setHasMounted(true);
      } catch (error) { }
    }
  useEffect(() => {
      fetchProducts();
  }, []);
  const storeInfo = useStoreInfo();
  if (!storeInfo || !hasMounted) return null;
  return (
    <>
      {productListSize > 0 ? (
        <div>
          <div className="relative mt-[8.5rem] gray-50">
            <div className="block md:hidden">
              <Image src={"/" + storeInfo.bannerUrl + "_mobile.png"} alt="Banner Mobile" width={768} height={400} className="w-full h-auto object-cover" />
            </div>
            <div className="hidden md:block max-w-screen-lg w-full m-auto">
              <Image src={"/" + storeInfo.bannerUrl + ".png"} alt="Banner Desktop" width={768} height={400} className="w-full h-auto object-cover"/>
            </div>
          </div>
          
          <div className="z-10 mx-full flex flex-col items-center align-middle justify-center px-2 md:px-0 py-5 my-2 relative">
            <h1 className="pb-5 text-4xl mt-8 w-full md:text-center">Novidades</h1>
            <div className="z-30 md:max-w-screen-lg mx-auto center grid lg:grid-cols-4 grid-cols-2 w-full gap-2 gap-y-4">
              {productList.map((item) => (
                <Item key={item.id} id={item.id} name={item.name} price={item.price} quantity={item.quantity} description={item.description} promo={item.promo} profileImageId={item.profileImageId} />
              ))}
            </div>
          </div>
        </div>
      ) : ( <h1>NENHUM PRODUTO CADASTRADO</h1> )}
    </>
  )
}

export const getStaticProps = async () => {
  try {
    //const data = await getProductsPaginatedNoStore(0, "");
    return { props: { products: [], itemsCount: 0 } }
  } catch (error) {
    return { props: { products: [], itemsCount: 0 } }
  }
}