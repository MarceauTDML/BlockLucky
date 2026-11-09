FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx *.html /usr/share/nginx/html/
COPY --chown=nginx:nginx assets /usr/share/nginx/html/assets
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
