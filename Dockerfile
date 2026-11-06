FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# nginx serves the site; a tiny Node counter (deploy/stats-server.mjs) answers /api/presence.
FROM nginx:1.27-alpine
RUN apk add --no-cache nodejs
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/stats-server.mjs deploy/followers.mjs /srv/
COPY deploy/start.sh /srv/start.sh
RUN tr -d '\r' < /srv/start.sh > /srv/start && mv /srv/start /srv/start.sh && chmod +x /srv/start.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["/srv/start.sh"]
