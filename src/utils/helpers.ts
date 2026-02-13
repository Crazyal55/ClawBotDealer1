// Async handler wrapper to catch errors consistently
export const asyncHandler = (fn: Function) => {
  return async (req: any, res: any, next: any) => {
    try {
      return await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// Response helpers
export const success = (res: any, data: any, message?: string) => {
  res.json({
    success: true,
    data,
    ...(message && { message })
  });
};

export const error = (res: any, statusCode: number, message: string, code?: string) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    code
  });
};

export const created = (res: any, data: any, message?: string) => {
  res.status(201).json({
    success: true,
    data,
    ...(message && { message })
  });
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidVIN = (vin: string): boolean => {
  // VIN format: 17 alphanumeric characters
  const vinRegex = /^[A-H0-9]{17}$/;
  return vinRegex.test(vin);
};

export const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 2;
};

export const isValidPrice = (price: number): boolean => {
  return price > 0 && price <= 1000000; // Max $1M for sanity
};

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/<script[^>]*>([\s\S]*?)<\/script>/gim, '');
};

export const sanitizeNumber = (num: any): number | null => {
  const parsed = parseFloat(num);
  return isNaN(parsed) ? null : parsed;
};

// Pagination helpers
export const getPagination = (page: number = 1, limit: number = 50) => {
  const offset = (page - 1) * limit;
  return {
    page,
    limit,
    offset,
    totalPages: Math.ceil(1000 / limit) // Assuming max 1000 for now
  };
};

// Date helpers
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const getDaysAgo = (date: Date): number => {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
