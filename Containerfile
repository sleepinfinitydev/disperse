FROM nginxinc/nginx-unprivileged:stable

LABEL org.opencontainers.image.source="https://github.com/sleepinfinitydev/disperse" \
      org.opencontainers.image.description="Disperse — Diagrams as Code SPA. Run with: docker run --rm -p 8765:8765 ghcr.io/sleepinfinitydev/disperse:latest"

USER root

# Copy static application files to the Nginx document root
COPY --chown=101:0 index.html favicon.svg /usr/share/nginx/html/
COPY --chown=101:0 css/ /usr/share/nginx/html/css/
COPY --chown=101:0 js/ /usr/share/nginx/html/js/
COPY --chown=101:0 examples/ /usr/share/nginx/html/examples/

# Expose unprivileged HTTP port and 12-Factor runtime configuration defaults
ENV PORT=8765
ENV KROKI_BASE_URL="https://kroki.io"
ENV KROKI_REMOTE_URL="https://kroki.io"
ENV ENGINE_MODE_MERMAID="local"
ENV ENGINE_MODE_BPMN="local"
ENV ENGINE_MODE_EXCALIDRAW="local"
ENV KROKI_DISABLED_ENGINES=""
ENV FOOTER_CREDITS='Made with <i data-lucide="heart" class="heart-icon"></i> in Betanzos · Copyleft <i data-lucide="copyright" class="copyleft-icon"></i> (<a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GPLv3</a>) by <a href="https://sleepinfinity.dev" target="_blank" rel="noopener noreferrer">sleepinfinity.dev</a> · <a href="https://github.com/sleepinfinitydev/disperse" target="_blank" rel="noopener noreferrer">Disperse</a> was built on the shoulders of giants: <a href="https://kroki.io" target="_blank" rel="noopener noreferrer">Kroki</a>, <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer">Excalidraw</a>, <a href="https://bpmn.io" target="_blank" rel="noopener noreferrer">bpmn.io</a>, <a href="https://ace.c9.io" target="_blank" rel="noopener noreferrer">Ace</a>, <a href="https://github.com/timmywil/panzoom" target="_blank" rel="noopener noreferrer">Panzoom</a>, <a href="https://github.com/nodeca/pako" target="_blank" rel="noopener noreferrer">Pako</a>, <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer">Lucide</a>, and inspired by <a href="https://niolesk.top" target="_blank" rel="noopener noreferrer">Niolesk</a>.'
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
EXPOSE 8765

RUN rm -f /etc/nginx/conf.d/default.conf && \
    sed -i 's|include /etc/nginx/conf.d/\*.conf;|include /tmp/disperse-nginx.conf;\n    include /etc/nginx/conf.d/*.conf;|' /etc/nginx/nginx.conf && \
    cat <<'EOF' > /docker-entrypoint.d/40-disperse.sh && \
    chmod 0755 /docker-entrypoint.d/40-disperse.sh && \
    chown -R 101:0 /usr/share/nginx/html/js/config.js && \
    chmod g=u /usr/share/nginx/html/js/config.js
#!/bin/sh
set -e

PORT_VAL="${PORT:-8765}"
case "$PORT_VAL" in
  ''|*[!0-9]*) PORT_VAL="8765" ;;
esac

escape_js() {
  printf '%s' "$1" | sed \
    -e 's/\\/\\\\/g' \
    -e 's/"/\\"/g' \
    -e 's/\r/\\r/g' \
    -e 's/\t/\\t/g' \
    -e ':a;N;$!ba;s/\n/\\n/g'
}

normalize_mode() {
  raw=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  case "$raw" in
    remote|external) printf 'remote' ;;
    disabled|false|0|off|no) printf 'disabled' ;;
    *) printf 'local' ;;
  esac
}

KROKI_URL_VAL="${KROKI_BASE_URL:-https://kroki.io}"
KROKI_REMOTE_VAL="${KROKI_REMOTE_URL:-https://kroki.io}"
FOOTER_VAL="${DISPERSE_FOOTER_CREDITS-${FOOTER_CREDITS}}"

MODE_MERMAID=$(normalize_mode "${ENGINE_MODE_MERMAID:-${ENABLE_MERMAID:-local}}")
MODE_BPMN=$(normalize_mode "${ENGINE_MODE_BPMN:-${ENABLE_BPMN:-local}}")
MODE_EXCALIDRAW=$(normalize_mode "${ENGINE_MODE_EXCALIDRAW:-${ENABLE_EXCALIDRAW:-local}}")
DISABLED_VAL=$(escape_js "${KROKI_DISABLED_ENGINES:-}")

ESCAPED_KROKI_URL=$(escape_js "$KROKI_URL_VAL")
ESCAPED_KROKI_REMOTE=$(escape_js "$KROKI_REMOTE_VAL")
ESCAPED_FOOTER=$(escape_js "$FOOTER_VAL")

RUNTIME_CFG="/tmp/disperse-config.js"
cat <<EOCFG > "$RUNTIME_CFG"
window.DISPERSE_CONFIG = Object.assign(
  {
    krokiBaseUrl: "${ESCAPED_KROKI_URL}",
    krokiRemoteUrl: "${ESCAPED_KROKI_REMOTE}",
    footerCredits: "${ESCAPED_FOOTER}",
    engineModes: {
      mermaid: "${MODE_MERMAID}",
      bpmn: "${MODE_BPMN}",
      excalidraw: "${MODE_EXCALIDRAW}"
    },
    disabledEngines: "${DISABLED_VAL}"
  },
  window.DISPERSE_CONFIG || {}
);
EOCFG

if [ -w /usr/share/nginx/html/js/config.js ]; then
  cp "$RUNTIME_CFG" /usr/share/nginx/html/js/config.js
fi

cat <<EONGINX > /tmp/disperse-nginx.conf
server {
    listen       ${PORT_VAL};
    server_name  _;

    location = /js/config.js {
        default_type application/javascript;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        alias ${RUNTIME_CFG};
    }

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
EONGINX

echo "Starting server at http://localhost:${PORT_VAL} ..."
EOF

USER 101

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
