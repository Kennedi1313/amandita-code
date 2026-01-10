import React from 'react';
import { usePagination, DOTS } from '../hooks/use-pagination';
import { BsArrowLeft, BsArrowRight } from 'react-icons/bs';
interface Props {
    onPageChange: Function,
    totalCount: number,
    siblingCount?: number,
    currentPage: number,
    pageSize: number,
    className: string
}
const Pagination = (props: Props) => {
  const {
    onPageChange,
    totalCount,
    siblingCount = 1,
    currentPage,
    pageSize,
    className
  } = props;

  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize
  });

  if (paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    onPageChange(currentPage + 1);
  };

  const onPrevious = () => {
    onPageChange(currentPage - 1);
  };

  let lastPage = paginationRange[paginationRange.length - 1];
  return (
    <div
      className="flex flex-row gap-2 w-full items-center justify-center mt-8"
    >
      <a href='#'
        className={currentPage === 0 ? "pointer-events-none opacity-30 border-solid border-2 border-gray-500 p-2 rounded-md" : 
        "border-solid border-2 border-gray-500 p-2 rounded-md"}
        onClick={onPrevious}
      >
        <BsArrowLeft></BsArrowLeft>
      </a>
      {paginationRange?.map((pageNumber : any) => {
        if (pageNumber === DOTS) {
          return <div key={pageNumber} className="pagination-item dots">&#8230;</div>;
        }

        return (
          <a href='#' key={pageNumber}
            className={pageNumber === currentPage ? "pointer-events-none border-solid border-b-2 border-gray-500 p-2" : 
            "p-2"
            }
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber + 1}
          </a>
        );
      })}
      <a href='#'
        className={currentPage === lastPage ? "pointer-events-none opacity-30 border-solid border-2 border-gray-500 p-2 rounded-md" : 
        "border-solid border-2 border-gray-500 p-2 rounded-md"}
        onClick={onNext}
      >
        <BsArrowRight></BsArrowRight>
      </a>
    </div>
  );
};

export default Pagination;