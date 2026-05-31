FROM node:18.18
ARG api_build_url=http://amandita-api:8080/api/v1
ARG api_runtime_url=/api/v1
ARG google_client_id=
ENV NEXT_PUBLIC_API_BUILD_URL=${api_build_url}
ENV NEXT_PUBLIC_API_RUNTIME_URL=${api_runtime_url}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${google_client_id}
WORKDIR /app
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV npm_config_registry=https://registry.npmjs.org/
COPY . .
RUN npm ci --no-audit
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
