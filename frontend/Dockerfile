# ---- Stage 1: build the React app ----
FROM node:24-slim AS build
WORKDIR /app

# Package files first, so a code-only change doesn't reinstall everything
COPY package.json package-lock.json ./
RUN npm ci

# VITE_API_URL is left unset: the browser calls /api/... on the same address
# and nginx forwards it to the backend container
COPY . .
RUN npm run build

# ---- Stage 2: serve it with nginx ----
# Only the built files are copied; Node, node_modules and the source stay behind
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
