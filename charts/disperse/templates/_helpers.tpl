{{/*
Expand the name of the chart.
*/}}
{{- define "disperse.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "disperse.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Fully qualified name for the self-hosted Kroki resources.
*/}}
{{- define "disperse.krokiFullname" -}}
{{- printf "%s-kroki" (include "disperse.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "disperse.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels for Disperse resources
*/}}
{{- define "disperse.labels" -}}
helm.sh/chart: {{ include "disperse.chart" . }}
{{ include "disperse.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | replace "+" "_" | trunc 63 | trimSuffix "-" | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels for the Disperse frontend Deployment & Service
*/}}
{{- define "disperse.selectorLabels" -}}
app.kubernetes.io/name: {{ include "disperse.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: app
{{- end }}

{{/*
Common labels for Kroki backend resources
*/}}
{{- define "disperse.krokiLabels" -}}
helm.sh/chart: {{ include "disperse.chart" . }}
{{ include "disperse.krokiSelectorLabels" . }}
{{- if .Values.kroki.image.tag }}
app.kubernetes.io/version: {{ .Values.kroki.image.tag | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels for the Kroki Deployment & Service
*/}}
{{- define "disperse.krokiSelectorLabels" -}}
app.kubernetes.io/name: {{ include "disperse.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: kroki
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "disperse.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "disperse.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Resolve Disperse numeric container port (handles both integer and named service.targetPort)
*/}}
{{- define "disperse.containerPort" -}}
{{- $tp := .Values.service.targetPort -}}
{{- if and $tp (or (kindIs "int" $tp) (kindIs "int64" $tp) (kindIs "float64" $tp)) -}}
{{- int $tp -}}
{{- else if and $tp (kindIs "string" $tp) (regexMatch "^[0-9]+$" $tp) -}}
{{- $tp -}}
{{- else -}}
{{- int (.Values.service.port | default 8765) -}}
{{- end -}}
{{- end }}

{{/*
Resolve Kroki Service port
*/}}
{{- define "disperse.krokiPort" -}}
{{- $svc := .Values.kroki.service | default dict -}}
{{- int ($svc.port | default .Values.kroki.port | default 8000) -}}
{{- end }}

{{/*
Resolve Kroki numeric container port
*/}}
{{- define "disperse.krokiContainerPort" -}}
{{- $svc := .Values.kroki.service | default dict -}}
{{- $tp := $svc.targetPort -}}
{{- if and $tp (or (kindIs "int" $tp) (kindIs "int64" $tp) (kindIs "float64" $tp)) -}}
{{- int $tp -}}
{{- else if and $tp (kindIs "string" $tp) (regexMatch "^[0-9]+$" $tp) -}}
{{- $tp -}}
{{- else -}}
{{- include "disperse.krokiPort" . -}}
{{- end -}}
{{- end }}

{{/*
Resolve Disperse container image
*/}}
{{- define "disperse.image" -}}
{{- $registry := default .Values.image.registry .Values.global.imageRegistry -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag | toString -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry .Values.image.repository $tag -}}
{{- else -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Resolve Kroki container image
*/}}
{{- define "disperse.krokiImage" -}}
{{- $registry := default .Values.kroki.image.registry .Values.global.imageRegistry -}}
{{- $tag := default "0.33.0" .Values.kroki.image.tag | toString -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry .Values.kroki.image.repository $tag -}}
{{- else -}}
{{- printf "%s:%s" .Values.kroki.image.repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Resolve Kroki companion sidecar image
Usage: {{ include "disperse.krokiSidecarImage" (dict "root" . "sidecar" .Values.kroki.sidecars.mermaid "defaultRepo" "yuzutech/kroki-mermaid") }}
*/}}
{{- define "disperse.krokiSidecarImage" -}}
{{- $root := .root -}}
{{- $sidecar := .sidecar | default dict -}}
{{- $img := $sidecar.image | default dict -}}
{{- $registry := default ($img.registry | default "docker.io") $root.Values.global.imageRegistry -}}
{{- $repo := $img.repository | default .defaultRepo -}}
{{- $tag := default ($root.Values.kroki.image.tag | default "0.33.0") $img.tag | toString -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repo $tag -}}
{{- else -}}
{{- printf "%s:%s" $repo $tag -}}
{{- end -}}
{{- end }}

{{/*
Resolve Helm test pod image
*/}}
{{- define "disperse.testImage" -}}
{{- $test := .Values.test | default dict -}}
{{- $img := $test.image | default dict -}}
{{- $registry := default ($img.registry | default "docker.io") .Values.global.imageRegistry -}}
{{- $repo := $img.repository | default "library/busybox" -}}
{{- $tag := default "1.36" $img.tag | toString -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repo $tag -}}
{{- else -}}
{{- printf "%s:%s" $repo $tag -}}
{{- end -}}
{{- end }}

{{/*
Render imagePullSecrets from global and local values
*/}}
{{- define "disperse.imagePullSecrets" -}}
{{- $secrets := concat (.Values.global.imagePullSecrets | default list) (.Values.imagePullSecrets | default list) -}}
{{- if $secrets -}}
imagePullSecrets:
{{- range $secrets }}
  {{- if kindIs "map" . }}
  - {{ toYaml . | nindent 4 | trim }}
  {{- else }}
  - name: {{ . }}
  {{- end }}
{{- end }}
{{- end -}}
{{- end }}

{{/*
Detect whether an HTTPRoute uses HTTPS
Usage: {{ include "disperse.httpRouteScheme" .Values.httpRoute }}
*/}}
{{- define "disperse.httpRouteScheme" -}}
{{- $hr := . | default dict -}}
{{- $isHttps := false -}}
{{- if $hr.https -}}
{{- $isHttps = true -}}
{{- else -}}
{{- range ($hr.parentRefs | default list) -}}
  {{- $sec := lower (default "" .sectionName | toString) -}}
  {{- if or (contains "https" $sec) (contains "tls" $sec) -}}
    {{- $isHttps = true -}}
  {{- end -}}
{{- end -}}
{{- end -}}
{{- if $isHttps -}}https{{- else -}}http{{- end -}}
{{- end }}

{{/*
Effective Kroki Base URL for the frontend browser
*/}}
{{- define "disperse.krokiBaseUrl" -}}
{{- if .Values.disperse.krokiBaseUrl -}}
{{- .Values.disperse.krokiBaseUrl | trimSuffix "/" -}}
{{- else if .Values.kroki.enabled -}}
  {{- $kIng := .Values.kroki.ingress | default dict -}}
  {{- $kHr := .Values.kroki.httpRoute | default dict -}}
  {{- if and $kIng.enabled (gt (len ($kIng.hosts | default list)) 0) -}}
    {{- $firstHost := index $kIng.hosts 0 -}}
    {{- if $firstHost.host -}}
      {{- $scheme := ternary "https" "http" (gt (len ($kIng.tls | default list)) 0) -}}
      {{- $firstPath := "" -}}
      {{- if gt (len ($firstHost.paths | default list)) 0 -}}
        {{- $p := (index $firstHost.paths 0).path | default "/" | trimSuffix "/" -}}
        {{- if and $p (ne $p "/") -}}
          {{- $firstPath = $p -}}
        {{- end -}}
      {{- end -}}
      {{- printf "%s://%s%s" $scheme $firstHost.host $firstPath -}}
    {{- else -}}
      {{- printf "http://localhost:%s" (include "disperse.krokiPort" .) -}}
    {{- end -}}
  {{- else if and $kHr.enabled (gt (len ($kHr.hostnames | default list)) 0) -}}
    {{- $scheme := include "disperse.httpRouteScheme" $kHr -}}
    {{- printf "%s://%s" $scheme (index $kHr.hostnames 0) -}}
  {{- else -}}
    {{- printf "http://localhost:%s" (include "disperse.krokiPort" .) -}}
  {{- end -}}
{{- else -}}
https://kroki.io
{{- end -}}
{{- end }}

{{/*
Effective Remote Fallback URL for remote-mode companion engines
*/}}
{{- define "disperse.krokiRemoteUrl" -}}
{{- $fallback := .Values.kroki.remoteFallbackUrl | default "https://kroki.io" -}}
{{- default $fallback .Values.disperse.krokiRemoteUrl | trimSuffix "/" -}}
{{- end }}

{{/*
Determine effective mode ("local" | "remote" | "disabled") for a companion engine.
Usage: {{ include "disperse.engineMode" (dict "root" . "engine" "mermaid") }}
*/}}
{{- define "disperse.engineMode" -}}
{{- $root := .root -}}
{{- $engine := .engine -}}
{{- $rawMode := "local" -}}
{{- if $root.Values.kroki.enabled -}}
  {{- $sidecars := $root.Values.kroki.sidecars | default dict -}}
  {{- $cfg := index $sidecars $engine | default dict -}}
  {{- $rawMode = lower (default "local" $cfg.mode | toString) -}}
{{- else -}}
  {{- $overrides := $root.Values.disperse.engineModes | default dict -}}
  {{- if hasKey $overrides $engine -}}
    {{- $rawMode = lower (index $overrides $engine | toString) -}}
  {{- end -}}
{{- end -}}
{{- if or (eq $rawMode "disabled") (eq $rawMode "false") (eq $rawMode "0") (eq $rawMode "off") (eq $rawMode "no") -}}
disabled
{{- else if or (eq $rawMode "remote") (eq $rawMode "external") -}}
remote
{{- else -}}
local
{{- end -}}
{{- end }}
