FROM node:22.17
ARG api_url=/api/v1
ARG base_domain=mostradigital.com.br
ARG admin_url=http://localhost:4173
ARG google_client_id=
ARG google_analytics_id=
ARG posthog_project_key=
ARG posthog_host=https://us.i.posthog.com
ENV VITE_API_URL=${api_url}
ENV VITE_BASE_DOMAIN=${base_domain}
ENV VITE_ADMIN_URL=${admin_url}
ENV VITE_GOOGLE_CLIENT_ID=${google_client_id}
ENV VITE_GOOGLE_ANALYTICS_ID=${google_analytics_id}
ENV VITE_POSTHOG_PROJECT_KEY=${posthog_project_key}
ENV VITE_POSTHOG_HOST=${posthog_host}
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5174
CMD ["npm", "run", "start"]
