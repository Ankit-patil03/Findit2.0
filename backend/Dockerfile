# Backend image: Node + Express API
FROM node:24-slim

ENV NODE_ENV=production
WORKDIR /app

# Package files first: Docker reuses this installed layer when only the code changes,
# so rebuilds after a code edit take seconds instead of a minute
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Then the code (.dockerignore keeps out node_modules, .env and uploads)
COPY . .

# Run as the limited "node" user, not root. It needs to own uploads/ for laptop mode
RUN mkdir -p uploads && chown node:node uploads
USER node

EXPOSE 5000
CMD ["node", "server.js"]
