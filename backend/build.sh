#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# 준비: Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate
