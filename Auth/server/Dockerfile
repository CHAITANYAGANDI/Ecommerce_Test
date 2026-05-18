FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Drop root before runtime. The `node` user ships with the base image.
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production

EXPOSE 5000
CMD ["node","app.js"]
