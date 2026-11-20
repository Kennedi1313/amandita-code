FROM node:24-bookworm-slim AS build
ARG api_build_url=http://amandita-api:8080
ARG api_runtime_url=http://localhost:8080
ARG google_client_id=
ARG portal_url=http://localhost:5174
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN printf 'VITE_API_BUILD_URL=%s\nVITE_API_RUNTIME_URL=%s\nVITE_GOOGLE_CLIENT_ID=%s\nVITE_PORTAL_URL=%s\n' \
  "$api_build_url" "$api_runtime_url" "$google_client_id" "$portal_url" > .env \
  && npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 4173
