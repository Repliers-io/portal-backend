#!/bin/bash

# k6 run --vus 2 --duration 10s get-listings-400.js

source "$(dirname "$0")/common-k6.sh"
run_k6_test "get-listings-400.js" "$@"