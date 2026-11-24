#!/usr/bin/env bash
# =============================================================================
# Deploy origin/main of JustSignsIndia on the Lightsail host by PULLING the image
# GitHub Actions built (.github/workflows/build-image.yml). Run by cron every 2 min:
#
#   */2 * * * * /bin/bash /home/ubuntu/p91/justsignsindia/repo/scripts/deploy-from-ghcr.sh >> /home/ubuntu/p91/autodeploy.log 2>&1
#
# Per tick:
#   1. skip if another run holds the lock, or the disable file exists;
#   2. git fetch; if origin/main equals .deployed-sha, nothing to do;
#   3. pull ghcr.io/hpalrecha/justsignsindia:<sha>. Not there yet (CI still
#      building) -> exit quietly and look again next tick;
#   4. check the image's revision label equals <sha>;
#   5. keep the running image as justsignsindia:prev, start the new one on the
#      same port with the same app.env, health-check for up to 90 s;
#   6. healthy -> record .deployed-sha and move the checkout to <sha>
#      (so cron runs the newest copy of this script);
#      unhealthy -> restart the previous image and never retry this <sha>
#      until .deploy-failed is deleted.
#
# STOP:   touch ~/p91/justsignsindia/.deploy-disabled   (delete to resume)
# RETRY:  rm ~/p91/justsignsindia/.deploy-failed
#
# Registry login: the package is private. Credentials are read from
# $GHCR_ENV (default: the file CarCareBooker's deploy already uses), lines
#   GHCR_USER=<github user>
#   GHCR_TOKEN=<token with read:packages on hpalrecha packages>
# =============================================================================
set -Eeuo pipefail

APP="justsignsindia"
PORT="8082"
D="${P91_APP_DIR:-$HOME/p91/$APP}"
BRANCH="main"
IMAGE="ghcr.io/hpalrecha/$APP"
GHCR_ENV="${GHCR_ENV:-/var/lib/carcarebooker-deploy/ghcr.env}"

log() { echo "$(date -u '+%F %T') [$APP-ghcr] $*"; }
healthy() { echo "$1" | grep -qE '^(200|301|302|304|401|403)$'; }

exec 9>"/tmp/p91-$APP-deploy.lock"
flock -n 9 || exit 0
[[ -e "$D/.deploy-disabled" ]] && exit 0

git -C "$D/repo" fetch -q origin "$BRANCH" || { log "fetch failed"; exit 0; }
TARGET="$(git -C "$D/repo" rev-parse "origin/$BRANCH")"
[[ "$TARGET" =~ ^[0-9a-f]{40}$ ]] || { log "cannot read origin/$BRANCH"; exit 0; }
[[ "$TARGET" == "$(cat "$D/.deployed-sha" 2>/dev/null)" ]] && exit 0
[[ "$TARGET" == "$(cat "$D/.deploy-failed" 2>/dev/null)" ]] && exit 0

# Private registry: log in with a throwaway Docker config so no credential is left behind.
DOCKER_CONFIG="$(mktemp -d)"; export DOCKER_CONFIG
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
if [[ -r "$GHCR_ENV" ]] || sudo -n test -r "$GHCR_ENV" 2>/dev/null; then
  GHCR_USER="$(sudo -n cat "$GHCR_ENV" 2>/dev/null | sed -n 's/^GHCR_USER=//p' || true)"
  GHCR_TOKEN="$(sudo -n cat "$GHCR_ENV" 2>/dev/null | sed -n 's/^GHCR_TOKEN=//p' || true)"
  [[ -n "${GHCR_TOKEN:-}" ]] && printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null 2>&1 \
    || log "registry login failed; trying anonymous pull"
fi

if ! docker pull -q "$IMAGE:$TARGET" >/dev/null 2>&1; then
  log "${TARGET:0:7}: image not in registry yet (Actions still building, or build failed) — retry next tick"
  exit 0
fi
REV="$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$IMAGE:$TARGET")"
if [[ "$REV" != "$TARGET" ]]; then
  log "${TARGET:0:7}: image label says '$REV' — refusing"; echo "$TARGET" > "$D/.deploy-failed"; exit 1
fi

log "deploying ${TARGET:0:7}"
PREV_IMG="$(docker inspect -f '{{.Image}}' "$APP" 2>/dev/null || true)"
[[ -n "$PREV_IMG" ]] && docker tag "$PREV_IMG" "$APP:prev"

run() { docker rm -f "$APP" >/dev/null 2>&1 || true
        docker run -d --name "$APP" --env-file "$D/app.env" --restart unless-stopped \
          -p "127.0.0.1:$PORT:5000" "$1" >/dev/null; }

run "$IMAGE:$TARGET"
code=""
for _ in $(seq 1 30); do
  sleep 3
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
  healthy "$code" && break
done

if healthy "$code"; then
  echo "$TARGET" > "$D/.deployed-sha"
  docker tag "$IMAGE:$TARGET" "$APP:latest"
  git -C "$D/repo" reset -q --hard "$TARGET"
  # Keep only the running image and :prev; drop older pulled SHAs.
  docker images "$IMAGE" --format '{{.Tag}}' | grep -vx "$TARGET" | xargs -r -I{} docker rmi "$IMAGE:{}" >/dev/null 2>&1 || true
  log "deployed ${TARGET:0:7} (HTTP $code)"
else
  log "${TARGET:0:7} unhealthy (HTTP ${code:-none}) — rolling back"
  echo "$TARGET" > "$D/.deploy-failed"
  if [[ -n "$PREV_IMG" ]]; then run "$APP:prev"; log "rolled back to previous image"; fi
  exit 1
fi
