#!/bin/bash

if [ ! -d ".venv" ]; then
  echo "venv not found, create it..."
  python3 -m venv .venv
  echo "Activate venv..."
  source .venv/bin/activate
  echo "Install requirements..."
  python -m pip install -r requirements.txt
else
  source .venv/bin/activate
fi


