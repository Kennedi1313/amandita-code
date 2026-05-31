FROM node:18.18
ARG api_url=/api/v1
ARG base_domain=mostradigital.com.br
ARG admin_url=http://localhost:4173
ARG google_client_id=
ENV VITE_API_URL=${api_url}
ENV VITE_BASE_DOMAIN=${base_domain}
ENV VITE_ADMIN_URL=${admin_url}
ENV VITE_GOOGLE_CLIENT_ID=${google_client_id}
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5174
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5174"]
