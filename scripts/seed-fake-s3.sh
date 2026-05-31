#!/usr/bin/env bash
# Seed FakeS3 local directory with example product images
# Usage: ./scripts/seed-fake-s3.sh

set -euo pipefail

HOST_S3_DIR="$HOME/.amigoscode/s3"
PRODUCT_BUCKET="amandita-products-uploads"
CUSTOMER_BUCKET="amandita-uploads"

# Example product and image IDs (adjust as needed)
mkdir -p "$HOST_S3_DIR/$PRODUCT_BUCKET/profile-images/22"
mkdir -p "$HOST_S3_DIR/$PRODUCT_BUCKET/profile-images/1"
mkdir -p "$HOST_S3_DIR/$CUSTOMER_BUCKET/profile-images/1"

# Small 1x1 PNG image (base64)
IMG_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAAAAgAB9HFkfwAAAABJRU5ErkJggg=="

echo "$IMG_BASE64" | base64 --decode > "$HOST_S3_DIR/$PRODUCT_BUCKET/profile-images/22/aa399f2b-a880-4f19-bf40-6e5d05efa696.jpg"
# second example
echo "$IMG_BASE64" | base64 --decode > "$HOST_S3_DIR/$PRODUCT_BUCKET/profile-images/1/example-image.jpg"
# customer example
echo "$IMG_BASE64" | base64 --decode > "$HOST_S3_DIR/$CUSTOMER_BUCKET/profile-images/1/example-customer.jpg"

chmod -R 755 "$HOST_S3_DIR"

echo "Seeded FakeS3 directory: $HOST_S3_DIR"

echo "Restart the backend container after seeding:"
echo "  docker compose up -d --build amandita-api"
