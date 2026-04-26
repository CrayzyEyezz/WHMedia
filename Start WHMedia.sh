#!/bin/bash

echo ""
echo "===================================="
echo "  WHMedia Streaming Server"
echo "===================================="
echo ""

# Get local IP
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
else
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || hostname)
fi

echo "Starting server..."
echo ""
echo "Access WHMedia from this computer:"
echo "  http://localhost:3001"
echo ""
echo "Access WHMedia from other devices:"
echo "  http://$IP:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Node.js server
cd "$(dirname "$0")"
node server.js
