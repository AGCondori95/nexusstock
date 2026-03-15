import type { NextFunction, Request, Response } from 'express';
import * as mediaService from '@services/media.service';
import type { ApiResponse, MediaUploadReponse, ProductDTO } from '@/types';

export const uploadProductImages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res
        .status(400)
        .json({ status: 'fail', message: 'No images provided.' } satisfies ApiResponse);
      return;
    }

    const productId = req.params['productId'] ?? '';
    const result = await mediaService.addProductImages(productId, files);

    const response: ApiResponse<ProductDTO> = {
      status: 'success',
      message: `${files.length} image(s) uploaded successfully.`,
      data: result,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const removeProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const productId = req.params['productId'] ?? '';
    const { imageUrl } = req.body as { imageUrl: string };

    if (!imageUrl) {
      res.status(400).json({
        status: 'fail',
        message: 'imageUrl is required in request body.',
      } satisfies ApiResponse);
      return;
    }

    const result = await mediaService.removeProductImage(productId, imageUrl);

    const response: ApiResponse<ProductDTO> = {
      status: 'success',
      message: 'Image removed successfully.',
      data: result,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const uploadGenericImages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res
        .status(400)
        .json({ status: 'fail', message: 'No images provided.' } satisfies ApiResponse);
      return;
    }

    const uploaded = await mediaService.uploadImages(files);

    const response: ApiResponse<MediaUploadReponse> = {
      status: 'success',
      message: `${files.length} image(s) uploaded successfully.`,
      data: { images: uploaded },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
