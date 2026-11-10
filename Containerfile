FROM nginx:stable

LABEL org.opencontainers.image.source="https://github.com/sleepinfinitydev/disperse"

# Copy static application files to the Nginx document root
COPY index.html favicon.svg /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY examples/ /usr/share/nginx/html/examples/

# Expose application HTTP port
ENV PORT=8765
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
EXPOSE 8765 80

RUN printf '#!/bin/sh\nset -e\nif [ "${PORT:-8765}" != "80" ] && ! grep -q "listen.*${PORT:-8765};" /etc/nginx/conf.d/default.conf 2>/dev/null; then\n  sed -i "s/listen       80;/listen       80;\\n    listen       ${PORT:-8765};/" /etc/nginx/conf.d/default.conf\nfi\necho "Starting server at http://localhost:${PORT:-8765} ..."\n' > /docker-entrypoint.d/40-disperse.sh && chmod +x /docker-entrypoint.d/40-disperse.sh

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
