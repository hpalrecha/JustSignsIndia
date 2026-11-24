# Production image for justsigns.co.in. Built by .github/workflows/build-image.yml and pulled by the
# Lightsail host (scripts/deploy-from-ghcr.sh). Same recipe the host used to build locally.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 5000
CMD ["node", "dist/index.js"]
