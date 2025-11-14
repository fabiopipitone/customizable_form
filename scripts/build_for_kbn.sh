#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <kibana_version>  (es: 9.1.5)"
  exit 1
fi

KBN_VERSION="$1"
PLUGIN_ID="customizableForm"

# directory del plugin (scripts/..)
PLUGIN_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
KIBANA_JSON="$PLUGIN_DIR/kibana.json"

# prendo versione plugin dal kibana.json
PLUGIN_VERSION=$(grep -oP '"version"\s*:\s*"\K[^"]+' "$KIBANA_JSON")

echo ">>> Building $PLUGIN_ID v$PLUGIN_VERSION for Kibana $KBN_VERSION"

# backup kibana.json
TMP_KIBANA_JSON="$KIBANA_JSON.bak"
cp "$KIBANA_JSON" "$TMP_KIBANA_JSON"

# patch kibanaVersion solo per la build
sed -E -i "s/\"kibanaVersion\": *\"[^\"]+\"/\"kibanaVersion\": \"${KBN_VERSION}\"/" "$KIBANA_JSON"

# lancia build dal root di kibana
KIBANA_ROOT="$PLUGIN_DIR/../.."
cd "$KIBANA_ROOT"

yarn plugin-helpers build --kibana-version "$KBN_VERSION"

# ripristina kibana.json
mv "$TMP_KIBANA_JSON" "$KIBANA_JSON"

# lo zip viene messo di solito qui:
BUILD_ZIP="$KIBANA_ROOT/build/kibana/$PLUGIN_ID/$PLUGIN_ID-$PLUGIN_VERSION.zip"

if [ ! -f "$BUILD_ZIP" ]; then
  echo "!!! Build zip not found at $BUILD_ZIP"
  exit 1
fi

# output “pulito” in una dist del plugin
DIST_DIR="$PLUGIN_DIR/dist"
mkdir -p "$DIST_DIR"

TARGET_ZIP="$DIST_DIR/${PLUGIN_ID}-${PLUGIN_VERSION}-kibana-${KBN_VERSION}.zip"
cp "$BUILD_ZIP" "$TARGET_ZIP"

echo ">>> Built: $TARGET_ZIP"
