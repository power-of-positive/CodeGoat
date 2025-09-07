#!/bin/bash

# Run validation without using npx to avoid hanging issues
cd /Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat
node node_modules/.bin/ts-node scripts/validate-task.ts "$@"