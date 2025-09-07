#!/bin/bash

# Run single API E2E test with proper timeout
NODE_ENV=test NODE_OPTIONS='--max-old-space-size=8192' \
  npx jest --forceExit --detectOpenHandles --maxWorkers=1 \
  --testTimeout=30000 --bail --verbose \
  simple-test.spec.ts

exit $?