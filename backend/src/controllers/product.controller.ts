import type { NextFunction, Request, Response } from 'express';
import * as productService from '@services/product.service';
import type {
  ApiResponse,
  PaginatedProducts,
  ProductDTO,
  ProductQueryParams,
  StockAdjustment,
} from '@/types';
import type {
  AdjustStockInput,
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from '@validations/product.validation';

export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as ProductQueryInput;
    const params: ProductQueryParams = {
      page: query.page,
      limit: query.limit,
      category: query.category,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await productService.getAllProducts(params);

    const response: ApiResponse<PaginatedProducts> = {
      status: 'success',
      message: 'Products retrieved successfully.',
      data: result,
      meta: result.meta,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const product = await productService.getProductById(req.params['id'] ?? '');

    const response: ApiResponse<ProductDTO> = {
      status: 'success',
      message: 'Product retrieved successfully.',
      data: product,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId ?? '';
    const product = await productService.createProduct(req.body as CreateProductInput, userId);

    const response: ApiResponse<ProductDTO> = {
      status: 'success',
      message: 'Product created successfully.',
      data: product,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const product = await productService.updateProduct(
      req.params['id'] ?? '',
      req.body as UpdateProductInput,
    );

    const response: ApiResponse<ProductDTO> = {
      status: 'success',
      message: 'Product updated successfully.',
      data: product,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await productService.deleteProduct(req.params['id'] ?? '');

    const response: ApiResponse<null> = {
      status: 'success',
      message: 'Product deactivated successfully.',
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const adjustment: StockAdjustment = {
      productId: req.params['id'] ?? '',
      ...(req.body as AdjustStockInput),
    };

    const product = await productService.adjustStock(adjustment);

    const response: ApiResponse<ProductDTO> = {
      status: 'success',
      message: 'Stock adjusted successfully.',
      data: product,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
