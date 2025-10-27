/**
 * CSP Override Middleware
 * Fixes Content Security Policy for external resources
 */

export const cspOverride = (req, res, next) => {
  // Remove existing CSP headers
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Content-Security-Policy');
  res.removeHeader('X-WebKit-CSP');

  // Set new CSP with all necessary permissions
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://cdn.tailwindcss.com",
    "script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://cdn.tailwindcss.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss: http://localhost:* http://127.0.0.1:*",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "form-action 'self'",
    "base-uri 'self'",
    "manifest-src 'self'"
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  next();
};

export default cspOverride;