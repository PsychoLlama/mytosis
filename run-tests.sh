#!/usr/bin/env bash
yarn -s lerna run build || FAIL=1
yarn ci || FAIL=1

if [[ ! -z "$FAIL" ]]; then
  exit 1
fi
