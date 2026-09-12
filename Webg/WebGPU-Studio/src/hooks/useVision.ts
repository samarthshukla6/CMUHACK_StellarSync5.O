/**
 * Hook for managing vision image state
 */

import { useState } from "react";

export function useVision() {
  const [visionImage, setVisionImage] = useState<string | null>(null);

  function handleVisionFile(file: File | null) {
    if (!file) {
      setVisionImage(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setVisionImage(result);
    };
    reader.readAsDataURL(file);
  }

  return {
    visionImage,
    setVisionImage,
    handleVisionFile,
  };
}

