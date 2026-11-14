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
ENV KROKI_REMOTE_URL="https://kroki.io"
ENV KROKI_INTERNAL_UPSTREAM=""
ENV ENGINE_MODE_MERMAID="local"
ENV ENGINE_MODE_BPMN="local"
ENV ENGINE_MODE_EXCALIDRAW="local"
ENV KROKI_DISABLED_ENGINES=""
ENV NGINX_CLIENT_MAX_BODY_SIZE="2m"
ENV NGINX_LARGE_CLIENT_HEADER_BUFFERS="4 16k"
ENV NGINX_PROXY_READ_TIMEOUT="60s"
ENV FOOTER_CREDITS='Made with <i data-lucide="heart" class="heart-icon"></i> in Betanzos · Copyleft <i data-lucide="copyright" class="copyleft-icon"></i> (<a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GPLv3</a>) by <a href="https://sleepinfinity.dev" target="_blank" rel="noopener noreferrer">sleepinfinity.dev</a> · <a href="https://github.com/sleepinfinitydev/disperse" target="_blank" rel="noopener noreferrer">Disperse</a> was built on the shoulders of giants: <a href="https://kroki.io" target="_blank" rel="noopener noreferrer">Kroki</a>, <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer">Excalidraw</a>, <a href="https://bpmn.io" target="_blank" rel="noopener noreferrer">bpmn.io</a>, <a href="https://ace.c9.io" target="_blank" rel="noopener noreferrer">Ace</a>, <a href="https://github.com/timmywil/panzoom" target="_blank" rel="noopener noreferrer">Panzoom</a>, <a href="https://github.com/nodeca/pako" target="_blank" rel="noopener noreferrer">Pako</a>, <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer">Lucide</a>, and inspired by <a href="https://niolesk.top" target="_blank" rel="noopener noreferrer">Niolesk</a>.'
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
EXPOSE 8765 80

RUN cat <<'EOF' > /docker-entrypoint.d/40-disperse.sh && chmod +x /docker-entrypoint.d/40-disperse.sh
#!/bin/sh
set -e

PORT_VAL="${PORT:-8765}"
CLIENT_MAX_BODY="${NGINX_CLIENT_MAX_BODY_SIZE:-2m}"
LARGE_HEADER_BUFFERS="${NGINX_LARGE_CLIENT_HEADER_BUFFERS:-4 16k}"
PROXY_READ_TIMEOUT="${NGINX_PROXY_READ_TIMEOUT:-60s}"
UPSTREAM_VAL=$(printf '%s' "${KROKI_INTERNAL_UPSTREAM:-}" | sed 's:/*$::')

if [ -w /etc/nginx/conf.d/default.conf ]; then
  LISTEN_EXTRA=""
  if [ "$PORT_VAL" != "80" ]; then
    LISTEN_EXTRA="    listen       ${PORT_VAL};"
  fi

  KROKI_PROXY_BLOCK=""
  if [ -n "$UPSTREAM_VAL" ]; then
    RESOLVER_IP=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf 2>/dev/null || true)
    case "$RESOLVER_IP" in
      *:*) RESOLVER_IP="[${RESOLVER_IP}]" ;;
      "") RESOLVER_IP="127.0.0.11" ;;
    esac
    KROKI_PROXY_BLOCK="
    location /kroki/ {
        resolver ${RESOLVER_IP} valid=10s;
        set \$kroki_upstream \"${UPSTREAM_VAL}\";
        rewrite ^/kroki/(.*)\$ /\$1 break;
        proxy_pass \$kroki_upstream\$uri\$is_args\$args;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout ${PROXY_READ_TIMEOUT};
    }"
  fi

  cat <<EONGINX > /etc/nginx/conf.d/default.conf
server {
    listen       80;
${LISTEN_EXTRA}
    server_name  localhost;

    client_max_body_size ${CLIENT_MAX_BODY};
    large_client_header_buffers ${LARGE_HEADER_BUFFERS};

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }
${KROKI_PROXY_BLOCK}
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
EONGINX
fi

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g'
}

normalize_mode() {
  raw=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  case "$raw" in
    remote|external) printf 'remote' ;;
    disabled|false|0|off|no) printf 'disabled' ;;
    *) printf 'local' ;;
  esac
}

if [ -w /usr/share/nginx/html/js/config.js ]; then
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

  cat <<EOCFG > /usr/share/nginx/html/js/config.js
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
fi

echo "Starting server at http://localhost:${PORT_VAL} ..."
EOF

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
