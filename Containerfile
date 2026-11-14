FROM nginx:stable

LABEL org.opencontainers.image.source="https://github.com/sleepinfinitydev/disperse"

# Copy static application files to the Nginx document root
COPY index.html favicon.svg /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY examples/ /usr/share/nginx/html/examples/

# Expose application HTTP port and 12-Factor runtime configuration defaults
ENV PORT=8765
ENV KROKI_BASE_URL="https://kroki.io"
ENV FOOTER_CREDITS='Made with <i data-lucide="heart" class="heart-icon"></i> in Betanzos · Copyleft <i data-lucide="copyright" class="copyleft-icon"></i> (<a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GPLv3</a>) by <a href="https://sleepinfinity.dev" target="_blank" rel="noopener noreferrer">sleepinfinity.dev</a> · <a href="https://github.com/sleepinfinitydev/disperse" target="_blank" rel="noopener noreferrer">Disperse</a> was built on the shoulders of giants: <a href="https://kroki.io" target="_blank" rel="noopener noreferrer">Kroki</a>, <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer">Excalidraw</a>, <a href="https://bpmn.io" target="_blank" rel="noopener noreferrer">bpmn.io</a>, <a href="https://ace.c9.io" target="_blank" rel="noopener noreferrer">Ace</a>, <a href="https://github.com/timmywil/panzoom" target="_blank" rel="noopener noreferrer">Panzoom</a>, <a href="https://github.com/nodeca/pako" target="_blank" rel="noopener noreferrer">Pako</a>, <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer">Lucide</a>, and inspired by <a href="https://niolesk.top" target="_blank" rel="noopener noreferrer">Niolesk</a>.'
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
EXPOSE 8765 80

RUN cat <<'EOF' > /docker-entrypoint.d/40-disperse.sh && chmod +x /docker-entrypoint.d/40-disperse.sh
#!/bin/sh
set -e

if [ "${PORT:-8765}" != "80" ] && ! grep -q "listen.*${PORT:-8765};" /etc/nginx/conf.d/default.conf 2>/dev/null; then
  sed -i "s/listen       80;/listen       80;\n    listen       ${PORT:-8765};/" /etc/nginx/conf.d/default.conf
fi

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g'
}

KROKI_URL_VAL="${KROKI_BASE_URL:-https://kroki.io}"
FOOTER_VAL="${DISPERSE_FOOTER_CREDITS-${FOOTER_CREDITS}}"

ESCAPED_KROKI_URL=$(escape_js "$KROKI_URL_VAL")
ESCAPED_FOOTER=$(escape_js "$FOOTER_VAL")

cat <<EOCFG > /usr/share/nginx/html/js/config.js
window.DISPERSE_CONFIG = Object.assign(
  {
    krokiBaseUrl: "${ESCAPED_KROKI_URL}",
    footerCredits: "${ESCAPED_FOOTER}"
  },
  window.DISPERSE_CONFIG || {}
);
EOCFG

echo "Starting server at http://localhost:${PORT:-8765} ..."
EOF

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
