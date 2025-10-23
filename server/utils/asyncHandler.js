/**
 * Wrap an async Express handler to surface errors to the error middleware.
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>} fn
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(fn) {
    return function wrappedHandler(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
