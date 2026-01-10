FROM node:18.18
ARG api_base_url
ENV VITE_API_BASE_URL=${api_base_url}
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
RUN echo "VITE_API_BASE_URL=${api_base_url}" > .env
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host"]