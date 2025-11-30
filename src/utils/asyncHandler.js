const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))  // ← pass req, res, next
            .catch(next);
    };
};

export { asyncHandler };
