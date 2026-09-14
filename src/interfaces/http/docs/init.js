window.SwaggerUIBundle({
  url: '/api/openapi.json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  filter: true,
  docExpansion: 'none',
  validatorUrl: null,
  withCredentials: true,
  persistAuthorization: false,
  requestInterceptor(request) {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes((request.method ?? 'GET').toUpperCase()) &&
      !request.url.includes('/webhooks/ifood')
    )
      request.headers['X-Diner-Client'] = 'web';
    return request;
  },
});
