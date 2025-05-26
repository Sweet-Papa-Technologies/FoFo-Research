#!/bin/bash

echo "Testing network connectivity from Docker container..."

# Test basic network connectivity
echo -e "\n1. Testing DNS resolution:"
docker-compose exec api nslookup google.com

echo -e "\n2. Testing external connectivity:"
docker-compose exec api ping -c 2 8.8.8.8

echo -e "\n3. Testing local network connectivity to 192.168.1.99:"
docker-compose exec api ping -c 2 192.168.1.99

echo -e "\n4. Testing HTTP connectivity to LMStudio:"
docker-compose exec api curl -v --max-time 5 http://192.168.1.99:1234/v1/models || echo "Failed to connect"

echo -e "\n5. Checking container's network configuration:"
docker-compose exec api ip addr show

echo -e "\n6. Checking routing table:"
docker-compose exec api ip route