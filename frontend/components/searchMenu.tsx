import { useState } from 'react';
import { TbSearch } from "react-icons/tb";
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiSearch } from 'react-icons/fi';

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = async () => {
    if (searchQuery.trim() !== '') {
      await router.push(`/search/${searchQuery}`);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await handleSearch(); 
    }
  };

  return (
    <div className='fixed top-20 md:top-4 md:left-0 z-40 md:z-50 flex md:px-10 items-center text-gray-500 w-full 
      bg-white md:bg-transparent h-fit p-2 md:h-12 md:w-1/3'>
      <div className='flex flex-row rounded-full w-full md:w-full border-solid border-[1px] border-black'>
        <button>
          <FiSearch className='text-2xl font-bold m-2 text-black' onClick={handleSearch} />
        </button>
        <input
          type="text"
          name="query"
          id="search"
          autoComplete="off"
          className='w-full rounded-full py-1 px-2 active:border-0 dark:text-black outline-none'
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown} 
        />
      </div>
    </div>
  );
}
