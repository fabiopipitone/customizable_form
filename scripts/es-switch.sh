#!/bin/bash

# Usage:
#   es-switch.sh <VERSION> [--trial]
#

VERSION=""
TRIAL_MODE=false

print_usage() {
  echo "Usage: $0 <VERSION> [--trial]"
  echo "  <VERSION>   Elasticsearch version (es: 9.1.7)"
  echo "  --trial     Try to enable trial license after startup"
}

# Argument parsing
while [ $# -gt 0 ]; do
  case "$1" in
    --trial)
      TRIAL_MODE=true
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      if [ -z "$VERSION" ]; then
        VERSION="$1"
      else
        echo "Unexpected argument: $1"
        print_usage
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$VERSION" ]; then
  print_usage
  exit 1
fi

NAME="es-dev-$VERSION"
ES_URL="http://localhost:9200"
ELASTIC_USER="elastic"
ELASTIC_PASS="elastic_pwd"
KIBANA_USER="kibana_dev"
KIBANA_PASS="kibana_dev_pwd"
MAX_WAIT_SEC=60

wait_for_es() {
  local start_ts
  start_ts=$(date +%s)
  echo ">>> Waiting for Elasticsearch ($NAME) to be up (max ${MAX_WAIT_SEC}s)..."
  while true; do
    if curl -s -u "$ELASTIC_USER:$ELASTIC_PASS" "$ES_URL/_cluster/health" >/dev/null 2>&1; then
      echo ">>> Elasticsearch is responding on $ES_URL"
      return 0
    fi
    now_ts=$(date +%s)
    elapsed=$((now_ts - start_ts))
    if [ "$elapsed" -ge "$MAX_WAIT_SEC" ]; then
      echo "!!! Elasticsearch did not start within ${MAX_WAIT_SEC}s"
      echo ">>> Last 50 log lines from container $NAME:"
      docker logs --tail 50 "$NAME" || true
      echo ">>> Stopping container $NAME due to startup failure"
      docker stop "$NAME" >/dev/null 2>&1 || true
      return 1
    fi
    sleep 2
  done
}

wait_for_security() {
  local start_ts
  start_ts=$(date +%s)
  echo ">>> Waiting for Security APIs (_security/_authenticate) to be ready (max ${MAX_WAIT_SEC}s)..."
  while true; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -u "$ELASTIC_USER:$ELASTIC_PASS" \
      "$ES_URL/_security/_authenticate" 2>/dev/null || echo "000")
    if [ "$code" -eq 200 ]; then
      echo ">>> Security subsystem is ready"
      return 0
    fi
    now_ts=$(date +%s)
    elapsed=$((now_ts - start_ts))
    if [ "$elapsed" -ge "$MAX_WAIT_SEC" ]; then
      echo "!!! Security subsystem did not become ready within ${MAX_WAIT_SEC}s"
      echo ">>> Last 50 log lines from container $NAME:"
      docker logs --tail 50 "$NAME" || true
      echo ">>> Stopping container $NAME due to startup failure"
      docker stop "$NAME" >/dev/null 2>&1 || true
      return 1
    fi
    sleep 2
  done
}

ensure_trial_license() {
  echo ">>> Trial mode requested, checking current license..."

  license_json=$(curl -s -u "$ELASTIC_USER:$ELASTIC_PASS" "$ES_URL/_license" || echo "")

  if echo "$license_json" | grep -q '"type":"trial"'; then
    echo ">>> Trial license already active (type=trial)"
    return 0
  fi

  if echo "$license_json" | grep -q '"mode":"trial"'; then
    echo ">>> Trial license already active (mode=trial)"
    return 0
  fi

  echo ">>> Trial not active, trying to start it..."
  start_resp=$(curl -s -u "$ELASTIC_USER:$ELASTIC_PASS" \
    -X POST "$ES_URL/_license/start_trial?acknowledge=true" 2>/dev/null || echo "")

  if echo "$start_resp" | grep -q '"trial_was_started":true'; then
    echo ">>> Trial license successfully started"
  else
    echo ">>> Trial start request sent, but response indicates it may have been already used or not allowed:"
    echo "    $start_resp"
  fi
}

create_or_update_kibana_dev() {
  echo ">>> Ensuring user [$KIBANA_USER] exists with role [kibana_system]..."

  USER_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -u "$ELASTIC_USER:$ELASTIC_PASS" \
    "$ES_URL/_security/user/$KIBANA_USER")

  if [ "$USER_EXISTS" -eq 404 ]; then
    curl -s -u "$ELASTIC_USER:$ELASTIC_PASS" \
      -X POST "$ES_URL/_security/user/$KIBANA_USER" \
      -H "Content-Type: application/json" \
      -d "{
        \"password\": \"$KIBANA_PASS\",
        \"roles\": [\"kibana_system\"]
      }" >/dev/null
    echo ">>> User [$KIBANA_USER] created."
  else
    echo ">>> User [$KIBANA_USER] already exists. Updating roles..."
    curl -s -u "$ELASTIC_USER:$ELASTIC_PASS" \
      -X PUT "$ES_URL/_security/user/$KIBANA_USER" \
      -H "Content-Type: application/json" \
      -d "{
        \"password\": \"$KIBANA_PASS\",
        \"roles\": [\"kibana_system\"]
      }" >/dev/null
  fi
}

verify_kibana_dev() {
  local start_ts
  start_ts=$(date +%s)
  echo ">>> Verifying [$KIBANA_USER] credentials (max ${MAX_WAIT_SEC}s)..."
  while true; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -u "$KIBANA_USER:$KIBANA_PASS" "$ES_URL/" 2>/dev/null || echo "000")
    if [ "$code" -eq 200 ]; then
      echo ">>> $KIBANA_USER credentials verified successfully"
      return 0
    fi
    now_ts=$(date +%s)
    elapsed=$((now_ts - start_ts))
    if [ "$elapsed" -ge "$MAX_WAIT_SEC" ]; then
      echo "!!! $KIBANA_USER could not authenticate within ${MAX_WAIT_SEC}s"
      echo ">>> Last 50 log lines from container $NAME:"
      docker logs --tail 50 "$NAME" || true
      return 1
    fi
    sleep 2
  done
}

echo ">>> Switching to Elasticsearch $VERSION ..."

# Stop any running es-dev-* container
RUNNING=$(docker ps --format '{{.Names}}' | grep '^es-dev-' || true)
if [ -n "$RUNNING" ]; then
  echo ">>> Stopping running container: $RUNNING"
  docker stop "$RUNNING" >/dev/null
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  echo ">>> Container $NAME found. Starting it..."
  docker start "$NAME" >/dev/null
  if ! wait_for_es; then
    exit 1
  fi
  if ! wait_for_security; then
    exit 1
  fi

  if [ "$TRIAL_MODE" = true ]; then
    ensure_trial_license
  fi

  create_or_update_kibana_dev

  if ! verify_kibana_dev; then
    echo "!!! $KIBANA_USER is not usable, aborting."
    exit 1
  fi

  echo ">>> Done. Point Kibana to:"
  echo "    elasticsearch.hosts: [\"$ES_URL\"]"
  echo "    elasticsearch.username: \"$KIBANA_USER\""
  echo "    elasticsearch.password: \"$KIBANA_PASS\"\n"
  echo ">>> Elasticsearch credentials:"
  echo "    user: \"$ELASTIC_USER\" - pwd: \"$ELASTIC_PASS\""
  exit 0
fi

echo ">>> Container $NAME not found. Creating it..."

docker run -d \
  --name "$NAME" \
  -p 9200:9200 \
  -e discovery.type=single-node \
  -e ELASTIC_PASSWORD="$ELASTIC_PASS" \
  -e xpack.security.enabled=true \
  -e xpack.security.http.ssl.enabled=false \
  -e xpack.security.transport.ssl.enabled=false \
  -e ES_JAVA_OPTS="-Xms1g -Xmx1g" \
  "docker.elastic.co/elasticsearch/elasticsearch:$VERSION" >/dev/null

if [ $? -ne 0 ]; then
  echo "!!! Failed to create container for Elasticsearch $VERSION."
  exit 1
fi

if ! wait_for_es; then
  exit 1
fi

if ! wait_for_security; then
  exit 1
fi

if [ "$TRIAL_MODE" = true ]; then
  ensure_trial_license
fi

create_or_update_kibana_dev

if ! verify_kibana_dev; then
  echo "!!! $KIBANA_USER is not usable, aborting."
  exit 1
fi

echo ">>> Done. Point Kibana to:"
echo "    elasticsearch.hosts: [\"$ES_URL\"]"
echo "    elasticsearch.username: \"$KIBANA_USER\""
echo "    elasticsearch.password: \"$KIBANA_PASS\"\n"
echo ">>> Elasticsearch credentials:"
echo "    user: \"$ELASTIC_USER\" - pwd: \"$ELASTIC_PASS\""