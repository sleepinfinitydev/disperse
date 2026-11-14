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
Fully qualified name for the self-hosted Kroki Deployment and internal Service.
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
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels for the Disperse frontend Deployment & published Service
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
Selector labels for the Kroki Deployment & internal Service
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
Effective Kroki Base URL for the frontend
*/}}
{{- define "disperse.krokiBaseUrl" -}}
{{- if .Values.disperse.krokiBaseUrl -}}
{{- .Values.disperse.krokiBaseUrl -}}
{{- else if .Values.kroki.enabled -}}
/kroki
{{- else -}}
https://kroki.io
{{- end -}}
{{- end }}

{{/*
Effective Remote Fallback URL for remote-mode companion engines
*/}}
{{- define "disperse.krokiRemoteUrl" -}}
{{- default "https://kroki.io" .Values.kroki.remoteFallbackUrl -}}
{{- end }}

{{/*
Determine effective mode ("local" | "remote" | "disabled") for a companion engine.
Usage: {{ include "disperse.engineMode" (dict "root" . "engine" "mermaid") }}
*/}}
{{- define "disperse.engineMode" -}}
{{- $root := .root -}}
{{- $engine := .engine -}}
{{- $sidecars := $root.Values.kroki.sidecars | default dict -}}
{{- $cfg := index $sidecars $engine | default dict -}}
{{- $rawMode := lower (default "remote" $cfg.mode | toString) -}}
{{- $baseUrl := include "disperse.krokiBaseUrl" $root -}}
{{- $remoteUrl := include "disperse.krokiRemoteUrl" $root -}}
{{- if or (eq $rawMode "disabled") (eq $rawMode "false") -}}
disabled
{{- else if and (not $root.Values.kroki.enabled) (eq $baseUrl $remoteUrl) -}}
local
{{- else if eq $rawMode "remote" -}}
remote
{{- else -}}
local
{{- end -}}
{{- end }}
