#!/bin/bash

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "❌ This script must be exec with 'source' or '.'."
  echo "   Use: source $0"
  return 1 2>/dev/null || exit 1
fi


if [ ! -d ".venv" ]; then
  echo "venv not found, create it..."
  python3 -m venv .venv
  echo "Activate venv..."
  source .venv/bin/activate
  echo "Install requirements..."
  python -m pip install -r requirements.txt
else
  echo "venv exists, activate venv..."
  source .venv/bin/activate
fi


