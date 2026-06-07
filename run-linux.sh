#!/usr/bin/env bash
# Convenience launcher — starts the HL app. Delegates to ops/linux/run-server.sh.
exec "$(cd "$(dirname "$0")" && pwd)/ops/linux/run-server.sh" "$@"
