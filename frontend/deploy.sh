#!/bin/bash

echo "🚀 Deploying StitchMatch Frontend to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project
echo "📦 Building project..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📝 Don't forget to set the VITE_API_URL environment variable in your Vercel dashboard:"
echo "   - Go to your Vercel project dashboard"
echo "   - Navigate to Settings > Environment Variables"
echo "   - Add VITE_API_URL with your Railway backend URL"
echo "   - Redeploy the project" 