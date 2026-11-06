#!/bin/sh
# nginx serves the site; the small Node counter behind /api/presence restarts itself if it ever stops.
(while true; do node /srv/stats-server.mjs; sleep 2; done) &
exec nginx -g 'daemon off;'
