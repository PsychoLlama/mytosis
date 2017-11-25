#!/usr/bin/env bash
export LINT_FAIL=
export FLOW_FAIL=
export TEST_FAIL=
export BUILD_FAIL=

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
      yarn run "$1" || {
        echo "'$1' script failed in '$(basename "$PWD")'"
        export "$2"=1
      }
    fi

    popd > /dev/null
  done
}

run_script_in_packages build BUILD_FAIL
run_script_in_packages lint LINT_FAIL
run_script_in_packages test TEST_FAIL

if [[ ! -z "$BUILD_FAIL" ]]; then
  echo Compilation failed.
  FAIL=1
fi

if [[ ! -z "$TEST_FAIL" ]]; then
  echo Tests failed.
  FAIL=1
fi

if [[ ! -z "$LINT_FAIL" ]]; then
  echo Lint failed.
  FAIL=1
fi

yarn flow || {
  echo Type checks failed.
  FAIL=1
}

if [[ ! -z "$FAIL" ]]; then
  exit 1
fi
