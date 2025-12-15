# Cognito Login Troubleshooting Guide

## Issue: "NotAuthorizedException: Incorrect username or password"

This error can occur for several reasons. Follow these steps to diagnose and fix:

### 1. Check Cognito App Client Settings

The most common cause is that `USER_PASSWORD_AUTH` flow is not enabled for your Cognito app client.

**To fix:**
1. Go to AWS Cognito Console → User Pools → Your User Pool
2. Click on "App integration" tab
3. Find your app client (Client ID: `4h4at7v8icke8k9r6ma0jn61kr`)
4. Click on the app client name
5. Scroll to "Authentication flows configuration"
6. **Enable "ALLOW_USER_PASSWORD_AUTH"**
7. Click "Save changes"

### 2. Check User Status

If a user has "Force change password" status, they cannot log in with a regular password until they change it.

**To fix via AWS Console:**
1. Go to the user in Cognito Console
2. Click "Actions" → "Reset password"
3. Set a new permanent password
4. Or use the admin password reset feature in the app (if you're logged in as admin)

**To fix via Admin Panel (if logged in as admin):**
1. Use the "Reset user password" section in the admin panel
2. Enter the username (e.g., `admin` or `josh@galantfoodco.com`)
3. Set a new password
4. This will remove the "Force change password" status

### 3. Verify User Exists

Make sure the user exists in your Cognito User Pool:
- Check the username matches exactly (case-sensitive)
- Verify the user is in the correct User Pool

### 4. Check Password Requirements

Ensure the password meets Cognito's requirements:
- Minimum 8 characters
- Must meet your User Pool's password policy

### 5. Verify Environment Variables

Check your `.env` file has all required Cognito settings:
```env
REACT_APP_AWS_REGION=us-west-1
REACT_APP_AWS_ACCESS_KEY_ID=your_key
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret
REACT_APP_COGNITO_USER_POOL_ID=your_pool_id
REACT_APP_COGNITO_CLIENT_ID=4h4at7v8icke8k9r6ma0jn61kr
```

### 6. Test with a Known Good User

Try logging in with a user you know works, or create a new test user via the admin panel.

## New Features Added

### Password Change Flow
- If a user has "Force change password" status, they'll see a password change form after attempting to log in
- They can set a new password directly from the login screen

### Admin Password Reset
- Admins can reset any user's password from the admin panel
- This removes "Force change password" status and sets a permanent password
- Useful for fixing users who can't log in

## Quick Fix Checklist

- [ ] Enable `USER_PASSWORD_AUTH` in Cognito app client settings
- [ ] Check user status in Cognito Console
- [ ] Reset password for affected users (via Console or Admin Panel)
- [ ] Verify environment variables are set correctly
- [ ] Test login with a known good user

## Still Having Issues?

1. Check browser console for detailed error messages
2. Verify AWS credentials have proper permissions:
   - `cognito-idp:InitiateAuth`
   - `cognito-idp:AdminSetUserPassword`
   - `cognito-idp:AdminGetUser`
   - `cognito-idp:RespondToAuthChallenge`
3. Check CloudWatch logs for Cognito errors
4. Ensure the User Pool is in the correct AWS region

