#!/bin/bash
# Schemathesis API Fuzzing Script
# Requires: pip install schemathesis

echo "Starting Schemathesis API Fuzzer..."

# In a real environment, you would point this to your OpenAPI/Swagger JSON definition
# e.g., schemathesis run http://localhost:3000/api-docs/swagger.json

schemathesis run http://localhost:3000/api-docs/swagger.json \
  --checks all \
  --hypothesis-max-examples 100 \
  --header "Authorization: Bearer mock_fuzzing_token" \
  --header "X-Device-ID: fuzz-device-1" \
  --header "X-Signature: mock-hmac-signature" \
  --workers 4 \
  --report report.html

echo "Fuzzing complete. Report generated at report.html"
