import React from 'react';
import { usePagination, DOTS } from '../../hooks/use-pagination';
import { Box, Flex, Button, Icon } from "@chakra-ui/react";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";

const Pagination = (props) => {
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
    <Flex
      direction="row"
      gap={2}
      w="full"
      align="center"
      justify="center"
      mt={8}
    >
      <Button
        isDisabled={currentPage === 0}
        variant="ghost"
        color={"#5f5482"}
        onClick={onPrevious}
        size="sm"
      >
        <Icon as={BsArrowLeft} />
      </Button>

      {paginationRange?.map((pageNumber, index) => {
        if (pageNumber === DOTS) {
          return (
            <Box color={"#5f5482"} key={index} className="pagination-item dots">
              &#8230;
            </Box>
          );
        }

        return (
          <Button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            size="sm"
            color={"#5f5482"}
            variant={pageNumber === currentPage ? "solid" : "ghost"}
            backgroundColor={pageNumber === currentPage ? "#ebe5fc" : undefined}
            borderBottom={pageNumber === currentPage ? "2px solid" : undefined}
            borderColor={pageNumber === currentPage ? "#5f5482" : undefined}
          >
            {pageNumber + 1}
          </Button>
        );
      })}

      <Button
        isDisabled={currentPage === lastPage}
        variant="ghost"
        color={"#5f5482"}
        onClick={onNext}
        size="sm"
      >
        <Icon as={BsArrowRight} />
      </Button>
    </Flex>
  );
};

export default Pagination;