#!/bin/bash

# Move existing log files to logs directory
LOGS_DIR="logs"
ROOT_DIR="$(dirname "$0")/.."

# Ensure logs directory exists
mkdir -p "$ROOT_DIR/$LOGS_DIR"

# Move existing log files from root directory
if [ -f "$ROOT_DIR/dev.log" ]; then
    mv "$ROOT_DIR/dev.log" "$ROOT_DIR/$LOGS_DIR/dev-$(date +%Y-%m-%d).log"
    echo "Moved dev.log to $LOGS_DIR/"
fi

if [ -f "$ROOT_DIR/litellm.log" ]; then
    mv "$ROOT_DIR/litellm.log" "$ROOT_DIR/$LOGS_DIR/litellm-$(date +%Y-%m-%d).log"
    echo "Moved litellm.log to $LOGS_DIR/"
fi

if [ -f "$ROOT_DIR/proxy.log" ]; then
    mv "$ROOT_DIR/proxy.log" "$ROOT_DIR/$LOGS_DIR/proxy-$(date +%Y-%m-%d).log"
    echo "Moved proxy.log to $LOGS_DIR/"
fi

if [ -f "$ROOT_DIR/server.log" ]; then
    mv "$ROOT_DIR/server.log" "$ROOT_DIR/$LOGS_DIR/server-$(date +%Y-%m-%d).log"
    echo "Moved server.log to $LOGS_DIR/"
fi

if [ -f "$ROOT_DIR/ui-dev.log" ]; then
    mv "$ROOT_DIR/ui-dev.log" "$ROOT_DIR/$LOGS_DIR/ui-dev-$(date +%Y-%m-%d).log"
    echo "Moved ui-dev.log to $LOGS_DIR/"
fi

# Move logs from src directory
if [ -f "$ROOT_DIR/src/dev.log" ]; then
    mv "$ROOT_DIR/src/dev.log" "$ROOT_DIR/$LOGS_DIR/src-dev-$(date +%Y-%m-%d).log"
    echo "Moved src/dev.log to $LOGS_DIR/"
fi

if [ -f "$ROOT_DIR/src/test.log" ]; then
    mv "$ROOT_DIR/src/test.log" "$ROOT_DIR/$LOGS_DIR/src-test-$(date +%Y-%m-%d).log"
    echo "Moved src/test.log to $LOGS_DIR/"
fi

# Move UI logs
if [ -f "$ROOT_DIR/ui/server.log" ]; then
    mv "$ROOT_DIR/ui/server.log" "$ROOT_DIR/$LOGS_DIR/ui-server-$(date +%Y-%m-%d).log"
    echo "Moved ui/server.log to $LOGS_DIR/"
fi

if [ -f "$ROOT_DIR/ui/ui-dev.log" ]; then
    mv "$ROOT_DIR/ui/ui-dev.log" "$ROOT_DIR/$LOGS_DIR/ui-ui-dev-$(date +%Y-%m-%d).log"
    echo "Moved ui/ui-dev.log to $LOGS_DIR/"
fi

echo "Log migration complete. All logs are now in $LOGS_DIR/"