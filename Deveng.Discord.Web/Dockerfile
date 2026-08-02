# syntax=docker/dockerfile:1
# Deveng.Discord.Web — Vite SPA + Express BFF (no .env COPY)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS final
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache wget
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./server.js
EXPOSE 3000
USER node
CMD ["node", "server.js"]
