# Frontend Deployment Guide

## Deploy to Vercel (Recommended)

### Prerequisites
1. **Get your Railway backend URL** from your Railway dashboard
2. **Install Vercel CLI**: `npm install -g vercel`

### Quick Deployment
```bash
cd frontend
./deploy.sh
```

### Manual Deployment Steps

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

5. **Set environment variables** in Vercel dashboard:
   - Go to your Vercel project dashboard
   - Navigate to **Settings > Environment Variables**
   - Add: `VITE_API_URL` = `https://your-railway-url.railway.app`
   - Redeploy the project

### Alternative: Deploy to Netlify

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Drag and drop** the `dist` folder to Netlify

3. **Set environment variables** in Netlify dashboard:
   - Go to **Site settings > Environment variables**
   - Add: `VITE_API_URL` = `https://your-railway-url.railway.app`

### Alternative: Deploy to Railway

1. **Create a new Railway project** for the frontend
2. **Connect your GitHub repository**
3. **Set the root directory** to `frontend`
4. **Set environment variables**:
   - `VITE_API_URL` = `https://your-backend-railway-url.railway.app`

## Environment Variables

- `VITE_API_URL`: Your Railway backend URL (e.g., `https://stitchmatch-backend.railway.app`)

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run lint`

### API Connection Issues
- Verify your Railway backend is running
- Check that `VITE_API_URL` is set correctly
- Ensure CORS is configured in your backend

### Deployment Issues
- Make sure you're in the `frontend` directory
- Check that `vercel.json` is present
- Verify the build output in the `dist` folder 