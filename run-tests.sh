#!/usr/bin/env bash
function command_exists {
  local result
  result="$(node -p "'$1' in require('./package.json').scripts")"

  if [[ "$result" == "true" ]]; then
    return 0
  fi

  return 1
}

function run_script_in_packages {
  for pkg in packages/*; do
    if [[ ! -f "$pkg/package.json" ]]; then
      continue
    fi

    pushd "$pkg" > /dev/null
    local SKIP=false

    command_exists "$1" || {
      echo "Package $(basename "$PWD") has no script '$1'. Skipping..."
      SKIP=true
    }

    if [[ "$SKIP" != "true" ]]; then
      yarn run "$1"
    fi

    popd > /dev/null
  done
}

run_script_in_packages lint
run_script_in_packages test
