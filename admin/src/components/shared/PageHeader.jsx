import { Box, Flex, Text } from "@chakra-ui/react";

const PageHeader = ({ title, description, children }) => (
  <Flex
    direction={{ base: "column", md: "row" }}
    gap={4}
    justify="space-between"
    align={{ base: "stretch", md: "flex-end" }}
    mb={6}
  >
    <Box>
      <Text fontWeight="bold" fontSize={{ base: "3xl", md: "4xl" }}>
        {title}
      </Text>
      {description && (
        <Text color="gray.600" mt={1}>
          {description}
        </Text>
      )}
    </Box>
    {children}
  </Flex>
);

export default PageHeader;
