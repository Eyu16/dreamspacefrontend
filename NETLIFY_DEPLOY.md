# Netlify Deployment Guide for DreamSpace AI

## Quick Fix for Blank Page Issue

If you're seeing a blank white page after deploying to Netlify, follow these steps:

### 1. Check Browser Console
Open the browser console (F12) and check for errors. Common issues:
- **404 errors**: Missing files or incorrect paths
- **CORS errors**: Backend not allowing requests from your Netlify domain
- **Network errors**: API URL still pointing to localhost

### 2. Configure Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Your backend API URL (e.g., `https://your-backend.herokuapp.com` or your deployed backend URL)
   - **Scopes**: Select "All scopes" or "Production, Deploy previews, Branch deploys"

### 3. Deploy Backend First

Before deploying the frontend, make sure your backend is deployed and accessible:

**Option A: Deploy to Heroku, Railway, or Render**
- Deploy your backend to one of these services
- Get the production URL (e.g., `https://dreamspace-backend.herokuapp.com`)
- Use this URL in the Netlify environment variable above

**Option B: Use Local Backend (Not Recommended for Production)**
- Only for testing
- Use a tool like `ngrok` to expose localhost
- Not suitable for production

### 4. Rebuild Your Site

After setting environment variables:
1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for the build to complete

### 5. Verify Build Settings

In Netlify dashboard → **Site settings** → **Build & deploy**:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- These should match the `netlify.toml` file (which is already configured)

### 6. Check Build Logs

If the page is still blank:
1. Go to **Deploys** tab
2. Click on the latest deploy
3. Check the build logs for errors
4. Look for TypeScript errors, missing dependencies, or build failures

## Common Issues and Solutions

### Issue: Blank Page with No Errors
**Solution**: 
- Check if `index.html` exists in the `dist` folder
- Verify that `main.tsx` is compiling correctly
- Check browser console for JavaScript errors

### Issue: 404 on Scripts
**Solution**:
- Ensure `_redirects` file exists in `public/` folder (already created)
- Verify `netlify.toml` has correct redirect rules (already configured)

### Issue: API Requests Failing
**Solution**:
1. Make sure backend is deployed and accessible
2. Set `VITE_API_BASE_URL` environment variable in Netlify
3. Update backend CORS to allow your Netlify domain:
   ```typescript
   app.use(cors({
     origin: ['https://your-netlify-app.netlify.app', 'http://localhost:5173']
   }));
   ```

### Issue: Styles Not Loading
**Solution**:
- Verify Tailwind CSS is configured correctly
- Check `index.css` imports Tailwind directives
- Ensure PostCSS is configured

## Step-by-Step Deployment Checklist

- [ ] Backend is deployed and accessible
- [ ] Backend CORS allows your Netlify domain
- [ ] `VITE_API_BASE_URL` environment variable is set in Netlify
- [ ] `netlify.toml` file exists in project root
- [ ] `public/_redirects` file exists
- [ ] Build command is: `npm run build`
- [ ] Publish directory is: `dist`
- [ ] Triggered a new deploy after setting environment variables
- [ ] Checked browser console for errors
- [ ] Verified build logs show successful build

## Testing Locally Before Deploying

To test with production-like settings locally:

```bash
# In DreamSpaceFrontend directory
VITE_API_BASE_URL=https://your-backend-url.com npm run build
npm run preview
```

This will build and preview the app with the production API URL.

