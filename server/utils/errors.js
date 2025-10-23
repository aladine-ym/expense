export function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

export function assertCondition(condition, status, message) {
    if (!condition) {
        throw createHttpError(status, message);
    }
}
