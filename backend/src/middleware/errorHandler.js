export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
export const errorHandler = (err, req, res, next) => {
  console.error(err);
  res
    .status(err.statusCode || 500)
    .json({ 
      error: err.message || "Internal Server Error",
      message: err.message || "Internal Server Error"
    });
};
export default errorHandler;
