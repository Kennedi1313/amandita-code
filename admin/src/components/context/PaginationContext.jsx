import React, { createContext, useContext, useState } from "react";

const PaginationContext = createContext({});

export const PaginationProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [category, setCategory] = useState("");

  const updateCategory = (newCategory) => {
    setCategory(newCategory);
    setCurrentPage(0);
  };

  return (
    <PaginationContext.Provider
      value={{ currentPage, setCurrentPage, category, updateCategory }}
    >
      {children}
    </PaginationContext.Provider>
  );
};

export const usePagination = () => useContext(PaginationContext);
