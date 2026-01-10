import React, { createContext, useContext, useState } from 'react';

const PaginationContext = createContext({} as any);

export const PaginationProvider = ({ children }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [category, setCategory] = useState('');

  const updateCategory = (newCategory: any) => {
    setCategory(newCategory);
    setCurrentPage(0); 
  };

  return (
    <PaginationContext.Provider value={{ currentPage, setCurrentPage, category, updateCategory }}>
      {children}
    </PaginationContext.Provider>
  );
};

export const usePagination = () => useContext(PaginationContext);
