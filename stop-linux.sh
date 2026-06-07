#!/usr/bin/env bash
# Convenience launcher — stops the HL app. Delegates to ops/linux/stop-server.sh.
exec "$(cd "$(dirname "$0")" && pwd)/ops/linux/stop-server.sh" "$@"
