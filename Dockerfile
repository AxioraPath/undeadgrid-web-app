# syntax=docker/dockerfile:1
# Frontend Undead Grid: build de Vite servido por Nginx.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Mismo dominio en producción: rutas relativas hacia el backend (/api, /socket.io).
# Si el back vive en otro dominio, pasar VITE_API_URL como build arg.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
# Config SPA + proxy opcional. El contenido estático se sirve directo.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
