FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Optional drivers for the Node server (PostgreSQL, Redis): used only when DATABASE_URL / REDIS_URL are set.
FROM node:22-alpine AS srvdeps
WORKDIR /srv
COPY deploy/package.json deploy/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# nginx serves the site; a tiny Node counter (deploy/stats-server.mjs) answers /api/presence.
FROM nginx:1.30-alpine
RUN apk add --no-cache nodejs
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/stats-server.mjs deploy/followers.mjs deploy/panel.mjs deploy/store.mjs deploy/connect.mjs deploy/music.mjs deploy/package.json /srv/
COPY --from=srvdeps /srv/node_modules /srv/node_modules
COPY deploy/start.sh /srv/start.sh
RUN tr -d '\r' < /srv/start.sh > /srv/start && mv /srv/start /srv/start.sh && chmod +x /srv/start.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["/srv/start.sh"]
