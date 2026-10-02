// An Error the global error handler turns into `status` with `message` as the response message
const httpError = (status, message) => Object.assign(new Error(message), { status });

module.exports = httpError;
