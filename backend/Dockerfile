FROM node:24-alpine

WORKDIR /app

COPY backend_core/package*.json ./
RUN npm ci --omit=dev

COPY backend_core ./

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "server.js"]
