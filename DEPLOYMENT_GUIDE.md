# Deployment Guide - Environment Variables Setup

This guide explains how to configure environment variables for your hosted application. The app requires AWS Cognito credentials to function properly.

## Required Environment Variables

Your application needs the following environment variables to be set in your hosting platform:

```
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key_here
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key_here
REACT_APP_COGNITO_USER_POOL_ID=your_user_pool_id_here
REACT_APP_COGNITO_CLIENT_ID=your_app_client_id_here
REACT_APP_COGNITO_ADMIN_GROUP=admin
REACT_APP_AWS_APP_ID=dbqznmct8mzz4
```

**Note:** In React, environment variables must be prefixed with `REACT_APP_` to be accessible in the browser.

---

## Platform-Specific Instructions

### 1. Vercel

1. Go to your project dashboard on [Vercel](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - Click **Add New**
   - Enter the variable name (e.g., `REACT_APP_AWS_REGION`)
   - Enter the value
   - Select the environments where it should be available (Production, Preview, Development)
   - Click **Save**
4. **Important:** After adding variables, you must **redeploy** your application:
   - Go to **Deployments**
   - Click the three dots (⋯) on your latest deployment
   - Select **Redeploy**

### 2. Netlify

1. Go to your site dashboard on [Netlify](https://netlify.com)
2. Navigate to **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add each variable:
   - Enter the key (e.g., `REACT_APP_AWS_REGION`)
   - Enter the value
   - Click **Save**
5. **Important:** After adding variables, trigger a new deployment:
   - Go to **Deployments**
   - Click **Trigger deploy** → **Deploy site**

### 3. AWS Amplify

1. Go to your app in [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Navigate to **App settings** → **Environment variables**
3. Click **Manage variables**
4. Add each variable:
   - Click **Add variable**
   - Enter the key and value
   - Click **Save**
5. **Important:** Amplify will automatically trigger a new build after saving variables

### 4. GitHub Pages / GitHub Actions

If using GitHub Actions for deployment:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each variable as a secret:
   - Enter the name (e.g., `REACT_APP_AWS_REGION`)
   - Enter the value
   - Click **Add secret**
5. Update your GitHub Actions workflow file (`.github/workflows/deploy.yml`) to use these secrets:
   ```yaml
   env:
     REACT_APP_AWS_REGION: ${{ secrets.REACT_APP_AWS_REGION }}
     REACT_APP_AWS_ACCESS_KEY_ID: ${{ secrets.REACT_APP_AWS_ACCESS_KEY_ID }}
     REACT_APP_AWS_SECRET_ACCESS_KEY: ${{ secrets.REACT_APP_AWS_SECRET_ACCESS_KEY }}
     REACT_APP_COGNITO_USER_POOL_ID: ${{ secrets.REACT_APP_COGNITO_USER_POOL_ID }}
     REACT_APP_COGNITO_CLIENT_ID: ${{ secrets.REACT_APP_COGNITO_CLIENT_ID }}
     REACT_APP_COGNITO_ADMIN_GROUP: ${{ secrets.REACT_APP_COGNITO_ADMIN_GROUP }}
     REACT_APP_AWS_APP_ID: ${{ secrets.REACT_APP_AWS_APP_ID }}
   ```

### 5. Heroku

1. Install the Heroku CLI if you haven't already
2. Set variables using the CLI:
   ```bash
   heroku config:set REACT_APP_AWS_REGION=us-east-1
   heroku config:set REACT_APP_AWS_ACCESS_KEY_ID=your_access_key_here
   heroku config:set REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key_here
   heroku config:set REACT_APP_COGNITO_USER_POOL_ID=your_user_pool_id_here
   heroku config:set REACT_APP_COGNITO_CLIENT_ID=your_app_client_id_here
   heroku config:set REACT_APP_COGNITO_ADMIN_GROUP=admin
   heroku config:set REACT_APP_AWS_APP_ID=dbqznmct8mzz4
   ```
3. Or use the Heroku Dashboard:
   - Go to your app → **Settings** → **Config Vars**
   - Click **Reveal Config Vars**
   - Add each variable and click **Add**

### 6. Railway

1. Go to your project on [Railway](https://railway.app)
2. Navigate to your service → **Variables**
3. Click **New Variable**
4. Add each variable:
   - Enter the key and value
   - Click **Add**
5. Railway will automatically redeploy when variables are added

### 7. Render

1. Go to your service on [Render](https://render.com)
2. Navigate to **Environment**
3. Click **Add Environment Variable**
4. Add each variable:
   - Enter the key and value
   - Click **Save Changes**
5. Render will automatically trigger a new deployment

---

## Verification

After setting environment variables and redeploying:

1. **Check the build logs** - Environment variables should be available during the build process
2. **Test the application** - Try logging in to verify Cognito is configured
3. **Check browser console** - Look for any configuration errors

## Troubleshooting

### Variables not working after deployment?

1. **Ensure variables are prefixed with `REACT_APP_`** - React only exposes variables with this prefix
2. **Redeploy after adding variables** - Most platforms require a new build to pick up new environment variables
3. **Check variable names** - Ensure there are no typos (case-sensitive)
4. **Verify values** - Make sure values don't have extra spaces or quotes
5. **Check build logs** - Look for any errors related to environment variables

### Still seeing "AWS Cognito is not fully configured"?

1. Verify all required variables are set:
   - `REACT_APP_AWS_REGION`
   - `REACT_APP_AWS_ACCESS_KEY_ID`
   - `REACT_APP_AWS_SECRET_ACCESS_KEY`
   - `REACT_APP_COGNITO_USER_POOL_ID`
   - `REACT_APP_COGNITO_CLIENT_ID`

2. Check that variables are available in the correct environment (Production vs Development)

3. Clear your browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

4. Check the browser's developer console for any errors

---

## Security Best Practices

⚠️ **Important Security Notes:**

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Use environment variables** - Never hardcode credentials in your source code
3. **Rotate credentials regularly** - Update AWS access keys periodically
4. **Use IAM roles when possible** - For AWS-hosted services, prefer IAM roles over access keys
5. **Limit permissions** - Give your AWS credentials only the minimum required permissions:
   - `cognito-idp:*` for Cognito operations
   - `dynamodb:*` for DynamoDB operations (if using)

---

## Getting Your AWS Credentials

If you need to create or find your AWS credentials:

1. **AWS Access Keys:**
   - Go to AWS Console → IAM → Users
   - Select your user → Security credentials tab
   - Create access key if needed

2. **Cognito User Pool ID:**
   - Go to AWS Console → Cognito → User pools
   - Select your user pool
   - Copy the User Pool ID from the top

3. **Cognito App Client ID:**
   - In your User Pool → App integration tab
   - Under App clients, copy the Client ID

4. **AWS Region:**
   - The region where your Cognito User Pool is located (e.g., `us-east-1`, `us-west-2`)

---

## Need Help?

If you're still having issues:
1. Check your hosting platform's documentation for environment variable setup
2. Verify your AWS credentials have the correct permissions
3. Check the browser console for specific error messages
4. Review the build logs for any warnings or errors



