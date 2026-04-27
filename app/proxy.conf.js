module.exports = {
  '/api': {
    target: 'http://localhost:5500',
    secure: false,
    changeOrigin: true,
    onProxyRes: function (proxyRes) {
      const cookies = proxyRes.headers['set-cookie'];
      if (cookies) {
        proxyRes.headers['set-cookie'] = cookies.map(cookie =>
          cookie
            .replace(/Domain=[^;]+;?\s*/gi, '')
            .replace(/SameSite=[^;]+;?\s*/gi, 'SameSite=Lax; ')
            .replace(/Secure;?\s*/gi, '')
        );
      }
    }
  },
  '/upload-profile-pic': {
    target: 'http://localhost:5500',
    secure: false,
    changeOrigin: true
  },
  '/profile-pic': {
    target: 'http://localhost:5500',
    secure: false,
    changeOrigin: true
  }
};