#!/usr/bin/env bash
export BUILD_FAIL=

function command_exists {
  local result
  result="$(node -p "'$1' in require('./package.json').scripts")"

  if [[ "$result" == "true" ]]; then
    return 0
  fi

  return 1
}

function run_script_in_workspaces {
  for pkg in workspaces/*; do
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
      yarn run "$1" || {
        echo "'$1' script failed in '$(basename "$PWD")'"
        export "$2"=1
      }
    fi

    popd > /dev/null
  done
}

run_script_in_workspaces build BUILD_FAIL

yarn test || {
  echo Tests failed.
  FAIL=1
}

if [[ ! -z "$BUILD_FAIL" ]]; then
  echo Compilation failed.
  FAIL=1
fi

yarn lint || {
  echo Lint failed.
  FAIL=1
}

if [[ ! -z "$FAIL" ]]; then
  exit 1
fi
