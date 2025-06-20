import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { CartService } from "../../services/cart/CartService";
import {
  AddToCartRequest,
  UpdateCartItemRequest,
  RemoveFromCartRequest,
  ApplyCouponRequest,
  UpdateShippingRequest,
  CartResponse,
  CartActionResponse,
  MergeCartRequest,
} from "../../types/cart.types";
import { ApiResponse } from "../../types/api.types";
import { AuthenticatedRequest } from "../../types/auth.types";

export class CartController extends BaseController {
  private cartService: CartService;

  constructor(cartService: CartService) {
    super();
    this.cartService = cartService;
  }

  /**
   * Get user's current cart
   * GET /api/v1/cart
   */
  public getCart = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);

      if (!userId && !sessionId) {
        res.status(400).json({
          success: false,
          message: "User ID or session ID is required",
        });
        return;
      }

      const cart = await this.cartService.getCart(userId, sessionId);

      const response: ApiResponse<CartResponse> = {
        success: true,
        message: "Cart retrieved successfully",
        data: { cart },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Add item to cart
   * POST /api/v1/cart/add
   */
  public addToCart = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);
      const { productId, quantity }: AddToCartRequest = req.body;

      // Validate input
      const validationErrors = this.validateAddToCartRequest({
        productId,
        quantity,
      });
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
        return;
      }

      const result = await this.cartService.addToCart(userId, sessionId, {
        productId,
        quantity,
      });

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: result.success
          ? "Item added to cart successfully"
          : "Failed to add item to cart",
        data: result,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update cart item quantity
   * PUT /api/v1/cart/update
   */
  public updateCartItem = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);
      const { productId, quantity }: UpdateCartItemRequest = req.body;

      // Validate input
      const validationErrors = this.validateUpdateCartRequest({
        productId,
        quantity,
      });
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
        return;
      }

      const result = await this.cartService.updateCartItem(userId, sessionId, {
        productId,
        quantity,
      });

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: result.success
          ? "Cart item updated successfully"
          : "Failed to update cart item",
        data: result,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Remove item from cart
   * DELETE /api/v1/cart/remove/:productId
   */
  public removeFromCart = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);
      const { productId } = req.params;

      if (!productId) {
        res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
        return;
      }

      const result = await this.cartService.removeFromCart(userId, sessionId, {
        productId,
      });

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: result.success
          ? "Item removed from cart successfully"
          : "Failed to remove item from cart",
        data: result,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Clear entire cart
   * DELETE /api/v1/cart/clear
   */
  public clearCart = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);

      const result = await this.cartService.clearCart(userId, sessionId);

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: "Cart cleared successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Apply coupon to cart
   * POST /api/v1/cart/coupon/apply
   */
  public applyCoupon = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);
      const { couponCode }: ApplyCouponRequest = req.body;

      if (!couponCode || couponCode.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Coupon code is required",
        });
        return;
      }

      const result = await this.cartService.applyCoupon(userId, sessionId, {
        couponCode: couponCode.trim().toUpperCase(),
      });

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: result.success
          ? "Coupon applied successfully"
          : "Failed to apply coupon",
        data: result,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Remove coupon from cart
   * DELETE /api/v1/cart/coupon/remove
   */
  public removeCoupon = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);

      const result = await this.cartService.removeCoupon(userId, sessionId);

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: "Coupon removed successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update shipping address for cart calculations
   * PUT /api/v1/cart/shipping
   */
  public updateShipping = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);
      const { state, city, postalCode }: UpdateShippingRequest = req.body;

      // Validate Nigerian states
      const validationErrors = this.validateShippingAddress({
        state,
        city,
        postalCode,
      });
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
        return;
      }

      const result = await this.cartService.updateShipping(userId, sessionId, {
        state,
        city,
        postalCode,
      });

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: "Shipping address updated successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate cart items and availability
   * POST /api/v1/cart/validate
   */
  public validateCart = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);

      const validation = await this.cartService.validateCart(userId, sessionId);

      const response: ApiResponse<any> = {
        success: true,
        message: "Cart validation completed",
        data: validation,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get cart item count (for header badge)
   * GET /api/v1/cart/count
   */
  public getCartItemCount = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);

      const count = await this.cartService.getCartItemCount(userId, sessionId);

      const response: ApiResponse<{ count: number }> = {
        success: true,
        message: "Cart item count retrieved successfully",
        data: { count },
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Merge guest cart with user cart after login
   * POST /api/v1/cart/merge
   */
  public mergeCart = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { guestSessionId, strategy }: MergeCartRequest = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      if (!guestSessionId) {
        res.status(400).json({
          success: false,
          message: "Guest session ID is required",
        });
        return;
      }

      const result = await this.cartService.mergeCart(
        userId,
        guestSessionId,
        strategy || "merge"
      );

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: "Cart merged successfully",
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Calculate shipping options for cart
   * POST /api/v1/cart/shipping/calculate
   */
  public calculateShipping = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId =
        req.sessionID || (req.headers["x-session-id"] as string);
      const { state, city, postalCode } = req.body;

      if (!state || !city) {
        res.status(400).json({
          success: false,
          message: "State and city are required for shipping calculation",
        });
        return;
      }

      const shippingOptions = await this.cartService.calculateShipping(
        userId,
        sessionId,
        { state, city, postalCode }
      );

      const response: ApiResponse<any> = {
        success: true,
        message: "Shipping options calculated successfully",
        data: shippingOptions,
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Save cart for later (move to wishlist)
   * POST /api/v1/cart/save-for-later/:productId
   */
  public saveForLater = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const result = await this.cartService.saveForLater(userId, productId);

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: result.success
          ? "Item saved for later"
          : "Failed to save item for later",
        data: result,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Move item from wishlist to cart
   * POST /api/v1/cart/move-to-cart/:productId
   */
  public moveToCart = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User authentication required",
        });
        return;
      }

      const result = await this.cartService.moveToCart(
        userId,
        productId,
        quantity || 1
      );

      const response: ApiResponse<CartActionResponse> = {
        success: true,
        message: result.success
          ? "Item moved to cart"
          : "Failed to move item to cart",
        data: result,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate add to cart request
   */
  private validateAddToCartRequest(data: AddToCartRequest): string[] {
    const errors: string[] = [];

    if (!data.productId || data.productId.trim().length === 0) {
      errors.push("Product ID is required");
    }

    if (!data.quantity || data.quantity < 1) {
      errors.push("Quantity must be at least 1");
    }

    if (data.quantity > 100) {
      errors.push("Quantity cannot exceed 100 items");
    }

    return errors;
  }

  /**
   * Validate update cart request
   */
  private validateUpdateCartRequest(data: UpdateCartItemRequest): string[] {
    const errors: string[] = [];

    if (!data.productId || data.productId.trim().length === 0) {
      errors.push("Product ID is required");
    }

    if (data.quantity < 0) {
      errors.push("Quantity cannot be negative");
    }

    if (data.quantity > 100) {
      errors.push("Quantity cannot exceed 100 items");
    }

    return errors;
  }

  /**
   * Validate Nigerian shipping address
   */
  private validateShippingAddress(data: UpdateShippingRequest): string[] {
    const errors: string[] = [];

    // Nigerian states validation
    const nigerianStates = [
      "Abia",
      "Adamawa",
      "Akwa Ibom",
      "Anambra",
      "Bauchi",
      "Bayelsa",
      "Benue",
      "Borno",
      "Cross River",
      "Delta",
      "Ebonyi",
      "Edo",
      "Ekiti",
      "Enugu",
      "FCT",
      "Gombe",
      "Imo",
      "Jigawa",
      "Kaduna",
      "Kano",
      "Katsina",
      "Kebbi",
      "Kogi",
      "Kwara",
      "Lagos",
      "Nasarawa",
      "Niger",
      "Ogun",
      "Ondo",
      "Osun",
      "Oyo",
      "Plateau",
      "Rivers",
      "Sokoto",
      "Taraba",
      "Yobe",
      "Zamfara",
    ];

    if (!data.state || data.state.trim().length === 0) {
      errors.push("State is required");
    } else if (!nigerianStates.includes(data.state)) {
      errors.push("Invalid Nigerian state");
    }

    if (!data.city || data.city.trim().length === 0) {
      errors.push("City is required");
    }

    if (data.postalCode && !/^\d{6}$/.test(data.postalCode)) {
      errors.push("Nigerian postal code must be 6 digits");
    }

    return errors;
  }
}
