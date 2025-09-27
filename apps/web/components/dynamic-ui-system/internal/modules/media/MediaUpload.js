"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { forwardRef, useEffect, useRef, useState } from "react";
import Compressor from "compressorjs";
import { Flex, Icon, Media, Spinner, Text } from "../../";
import styles from "./MediaUpload.module.scss";
const MediaUpload = forwardRef(({
  onFileUpload,
  compress = true,
  aspectRatio = "16 / 9",
  quality = 0.8,
  convertTypes = ["image/png", "image/webp", "image/jpg"],
  emptyState = "Drag and drop or click to browse",
  resizeMaxWidth = 1920,
  resizeMaxHeight = 1920,
  resizeWidth = 1200,
  resizeHeight = 1200,
  loading = false,
  sizes,
  children,
  initialPreviewImage = null,
  accept = "image/*",
  ...rest
}, ref) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState(initialPreviewImage); // Use prop as initial state
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    if (initialPreviewImage) {
      setPreviewImage(initialPreviewImage);
    }
  }, [initialPreviewImage]);
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  const handleFileSelection = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  const handleFiles = (files) => {
    const file = files[0];
    if (!file) {
      return;
    }
    if (file.type.startsWith("image/")) {
      setPreviewImage(URL.createObjectURL(file));
      if (compress && file.type.startsWith("image/")) {
        compressImage(file);
      } else {
        uploadFile(file);
      }
    } else {
      console.warn("Unsupported file type:", file.type);
    }
  };
  const compressImage = (file) => {
    new Compressor(file, {
      convertTypes: convertTypes,
      quality: quality,
      maxWidth: resizeMaxWidth,
      maxHeight: resizeMaxHeight,
      convertSize: 400 * 1024,
      width: resizeWidth,
      height: resizeHeight,
      success(compressedFile) {
        uploadFile(compressedFile);
      },
      error(err) {
        console.error("Compression error:", err);
        uploadFile(file);
      },
    });
  };
  const uploadFile = async (file) => {
    setUploading(true);
    if (onFileUpload) {
      await onFileUpload(file);
    }
    setUploading(false);
  };
  return (_jsxs(Flex, {
    style: { isolation: "isolate", cursor: "pointer" },
    transition: "micro-medium",
    overflow: "hidden",
    className: styles.container,
    aspectRatio: aspectRatio,
    fillWidth: true,
    center: true,
    border: "neutral-medium",
    radius: "l",
    onClick: handleFileSelection,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    ...rest,
    children: [
      !loading && (_jsx(_Fragment, {
        children: previewImage
          ? (_jsx(Media, {
            height: undefined,
            style: {
              filter: uploading ? "grayscale(1)" : "",
            },
            sizes: sizes,
            src: previewImage ? previewImage : "",
            alt: "Preview of uploaded image",
          }))
          : (_jsx(Flex, {
            fill: true,
            center: true,
            children: _jsx(Icon, { name: "plus", size: "l" }),
          })),
      })),
      children,
      _jsx(Flex, {
        className: styles.upload,
        zIndex: 1,
        transition: "micro-medium",
        position: "absolute",
        fill: true,
        padding: "m",
        horizontal: "center",
        vertical: "center",
        children: uploading || loading
          ? (_jsx(Spinner, { size: "l" }))
          : (_jsx(Text, {
            className: styles.text,
            align: "center",
            children: emptyState,
          })),
      }),
      _jsx("input", {
        type: "file",
        ref: inputRef,
        accept: accept,
        style: { display: "none" },
        onChange: (e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
          }
        },
      }),
    ],
  }));
});
MediaUpload.displayName = "MediaUpload";
export { MediaUpload };
//# sourceMappingURL=MediaUpload.js.map
