#!/bin/bash

run_k6_test() {
    local script_name="$1"
    local base_url="${2:-http://localhost:8080}"
    local vus="${3:-2}"
    local duration="${4:-10s}"

    # if [ -z "$api_key" ]; then
    #     echo "Usage: $0 [BASE_URL] [VUS] [DURATION]"
    #     echo "Example: $0 http://localhost:8080 2 10s"
    #     exit 1
    # fi

    k6 run --vus "$vus" --duration "$duration" -e BASE_URL="$base_url" "$script_name"
}