FROM node:18.18
ARG api_base_url
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
