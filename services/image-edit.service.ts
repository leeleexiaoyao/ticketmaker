import { CropParams } from '../models/draft';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const normalizeCrop = (crop: CropParams, slotWidth: number, slotHeight: number): CropParams => {
  const next = { ...crop };
  const renderWidth = next.width * next.scale;
  const renderHeight = next.height * next.scale;

  if (renderWidth <= slotWidth) {
    next.x = (slotWidth - renderWidth) / 2;
  } else {
    next.x = clamp(next.x, slotWidth - renderWidth, 0);
  }

  if (renderHeight <= slotHeight) {
    next.y = (slotHeight - renderHeight) / 2;
  } else {
    next.y = clamp(next.y, slotHeight - renderHeight, 0);
  }

  return next;
};

export const ImageEditService = {
  computeCropTransform(imageWidth: number, imageHeight: number, slotWidth: number, slotHeight: number): CropParams {
    const scale = Math.max(slotWidth / imageWidth, slotHeight / imageHeight);
    const width = imageWidth;
    const height = imageHeight;
    const renderWidth = width * scale;
    const renderHeight = height * scale;

    return {
      x: (slotWidth - renderWidth) / 2,
      y: (slotHeight - renderHeight) / 2,
      width,
      height,
      scale,
    };
  },

  applyCropToRenderState(
    crop: CropParams,
    patch: Partial<Pick<CropParams, 'x' | 'y' | 'scale'>>,
    slotWidth: number,
    slotHeight: number,
  ): CropParams {
    const scale = typeof patch.scale === 'number' ? clamp(patch.scale, 0.1, 10) : crop.scale;
    const next: CropParams = {
      ...crop,
      ...patch,
      scale,
    };

    return normalizeCrop(next, slotWidth, slotHeight);
  },
};
