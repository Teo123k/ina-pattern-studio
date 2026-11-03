#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ ! -f "$script_dir/.env" ]; then
  echo "Missing $script_dir/.env" >&2
  exit 1
fi

set -a
. "$script_dir/.env"
set +a

export INA_TOOL_SERVICE_API_KEY="${INA_TOOL_SERVICE_API_KEY:-${SERVICE_API_KEY:?SERVICE_API_KEY is required}}"
exec node "$script_dir/src/mcp-server.mjs"
