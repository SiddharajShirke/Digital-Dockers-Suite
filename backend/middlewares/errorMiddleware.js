const errorHandler = (err, req, res, _next) => {
    // In Express, res.statusCode defaults to 200. If it's still 200 on error, it should be 500.
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    console.error('--- API ERROR THROWN ---');
    console.error(err);
    console.error('------------------------');

    res.status(statusCode);

    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};

module.exports = { errorHandler };
