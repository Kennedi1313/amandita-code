FROM node:18.18
ARG api_build_url=http://amandita-api:8080
ARG api_runtime_url=http://localhost:8080
ARG google_client_id=
ARG portal_url=http://localhost:5174
ENV VITE_API_BUILD_URL=${api_build_url}
ENV VITE_API_RUNTIME_URL=${api_runtime_url}
ENV VITE_GOOGLE_CLIENT_ID=${google_client_id}
ENV VITE_PORTAL_URL=${portal_url}
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN echo "VITE_API_BUILD_URL=${api_build_url}" > .env
RUN echo "VITE_API_RUNTIME_URL=${api_runtime_url}" >> .env
RUN echo "VITE_GOOGLE_CLIENT_ID=${google_client_id}" >> .env
RUN echo "VITE_PORTAL_URL=${portal_url}" >> .env
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host"]
