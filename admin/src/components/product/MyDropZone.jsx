import React, { useCallback, useState } from "react";
import { Box, Flex, Image, Stack, IconButton, Text } from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import { FiUpload, FiX } from "react-icons/fi";

const MyDropzone = ({
  existingImages = [], // imagens do backend [{id, url}]
  setExistingImages, // setter para imagens antigas
  newImages = [], // arquivos novos
  setNewImages, // setter para arquivos novos
  setImagesToDelete, // ids de imagens antigas a remover
  setHasNewThumb, // controla se há nova imagem para ser a principal
}) => {
  const [imageLimitMessage, setImageLimitMessage] = useState("");
  const remainingSlots = Math.max(0, 5 - existingImages.length - newImages.length);

  const removeExistingImage = (imageToRemove) => {
    console.log("deleting image: ");
    console.log(imageToRemove.id);
    setExistingImages((prev) =>
      prev.filter((img) => img.id !== imageToRemove.id),
    );
    setImagesToDelete((prev) => [...prev, imageToRemove.id]);
  };

  const removeNewImage = (fileToRemove) => {
    URL.revokeObjectURL(fileToRemove.preview);
    setNewImages((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        setImageLimitMessage("Cada produto pode ter no máximo 5 imagens. Use JPG, PNG ou HEIC.");
      } else {
        setImageLimitMessage("");
      }
      const filesWithPreview = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      );
      setNewImages((prev) => [...prev, ...filesWithPreview]);
      setHasNewThumb(true); // a última nova imagem será a profile
    },
    [setNewImages, setHasNewThumb],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".heic", ".heif"] },
    maxFiles: Math.max(remainingSlots, 1),
    disabled: remainingSlots === 0,
    onDrop,
  });

  return (
    <>
      <Box w="100%" textAlign="center" p={0} rounded="md" mb={4}>
        <Flex flexWrap="wrap" gap={2} justifyContent="center">
          {[
            ...existingImages.map((img) => ({ type: "existing", data: img })),
            ...newImages.map((file) => ({ type: "new", data: file })),
          ].map((item, index, arr) => {
            const isLast = index === arr.length - 1;
            const isExisting = item.type === "existing";
            const key = isExisting
              ? item.data.id
              : item.data.name + item.data.preview;
            const borderColor = isLast ? "#1f633c" : "#eee";

            return (
              <Box
                key={key}
                position="relative"
                boxSize="100px"
                border="3px solid"
                borderColor={borderColor}
                rounded="md"
                overflow="hidden"
              >
                <Image
                  src={isExisting ? item.data.url : item.data.preview}
                  objectFit="cover"
                  boxSize="100%"
                />
                <IconButton
                  icon={<FiX />}
                  size="xs"
                  colorScheme="red"
                  position="absolute"
                  top="1"
                  right="1"
                  aria-label="Remover imagem"
                  onClick={() =>
                    isExisting
                      ? removeExistingImage(item.data)
                      : removeNewImage(item.data)
                  }
                />
              </Box>
            );
          })}
        </Flex>
      </Box>

      <Box
        {...getRootProps()}
        w="100%"
        textAlign="center"
        border="dashed"
        borderColor="#1f633c"
        borderRadius="3xl"
        fontWeight="bold"
        color={remainingSlots === 0 ? "gray.500" : "#1f633c"}
        p={6}
        rounded="md"
        cursor={remainingSlots === 0 ? "not-allowed" : "pointer"}
        opacity={remainingSlots === 0 ? 0.65 : 1}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Solte as imagens aqui...</p>
        ) : (
          <Stack textAlign="center" alignContent="center">
            <FiUpload style={{ width: "100%", fontWeight: "bold" }} />
            <p>
              {remainingSlots === 0
                ? "Limite de 5 imagens atingido"
                : `Adicione imagens (${existingImages.length + newImages.length}/5). Restam ${remainingSlots}.`}
            </p>
          </Stack>
        )}
      </Box>
      {imageLimitMessage && (
        <Text mt={2} color="orange.600" fontSize="sm" role="status">
          {imageLimitMessage}
        </Text>
      )}
    </>
  );
};

export default MyDropzone;
