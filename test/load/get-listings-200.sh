#!/bin/bash
# k6 run --vus 5 --duration 10s get-listings-200.js

source "$(dirname "$0")/common-k6.sh"
run_k6_test "get-listings-200.js" "$@"