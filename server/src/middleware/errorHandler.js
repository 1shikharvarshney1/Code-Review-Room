export function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err.message);

  const status = err.status || 500;
  const message = err.status ? err.message : 'Internal server error';

  res.status(status).json({ message });
}
