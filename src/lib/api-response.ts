/**
 * Standardized API response utilities for consistent error and success formats.
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  options?: {
    code?: string;
    details?: unknown;
  },
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: message,
      code: options?.code,
      details: options?.details,
    },
    { status: statusCode },
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode },
  );
}
