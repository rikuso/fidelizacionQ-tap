/* utils/asyncHandler.js */

/**
 * asyncHandler
 * Helper to wrap async route handlers and forward errors to Express error handler.
 * @param {Function} fn - Async middleware or controller function (req, res, next) => Promise
 * @returns {Function} Wrapped function with error handling
 */
module.exports = fn => (req, res, next) => {
  Promise
    .resolve(fn(req, res, next))
    .catch(next);
};
