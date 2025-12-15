# Step-by-Step Login Fix

## Current Issue: "NotAuthorizedException: Incorrect username or password"

Since all your users have "Force change password" status, here's how to get logged in:

---

## 🎯 Quick Solution: Reset Password First, Then Login

### Step 1: Enable USER_PASSWORD_AUTH (CRITICAL - Do This First!)

**This is the #1 cause of login failures:**

1. Go to **AWS Cognito Console** → **User Pools** → Your User Pool
2. Click **"App integration"** tab
3. Find your app client (Client ID: `4h4at7v8icke8k9r6ma0jn61kr`)
4. Click on the app client name
5. Scroll to **"Authentication flows configuration"**
6. **✅ Check "ALLOW_USER_PASSWORD_AUTH"**
7. Click **"Save changes"**

**⚠️ Without this, login will ALWAYS fail!**

---

### Step 2: Reset Password via AWS CLI

Since you can't log in yet, use AWS CLI to reset a password:

```bash
# Replace with your actual values
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username josh@galantfoodco.com \
  --password "NewPassword123!" \
  --permanent \
  --region us-west-1
```

**To find your User Pool ID:**
- Check `.env` file: `grep COGNITO_USER_POOL_ID .env`
- Or Cognito Console → User Pools → Your Pool → General settings

**This will:**
- Set a permanent password
- Remove "Force change password" status
- Allow the user to log in immediately

---

### Step 3: Add User to Admin Group (Optional)

If you want admin access:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username josh@galantfoodco.com \
  --group-name admin \
  --region us-west-1
```

---

### Step 4: Log In to the App

1. Open your app
2. Username: `josh@galantfoodco.com`
3. Password: `NewPassword123!` (or whatever you set)
4. Click "Sign in"

**You should now be logged in!**

---

## 🔄 Alternative: If You Know the Temporary Password

If you know the temporary password that was set when the user was created:

1. **Make sure USER_PASSWORD_AUTH is enabled** (Step 1 above)
2. Try logging in with the temporary password
3. The app will show a "Set New Password" form
4. Enter a new password
5. You'll be logged in automatically

---

## 🛠️ Troubleshooting

### "Still getting NotAuthorizedException after enabling USER_PASSWORD_AUTH"

**Check:**
1. ✅ USER_PASSWORD_AUTH is enabled (refresh the Cognito Console page to verify)
2. ✅ Password was reset with `--permanent` flag
3. ✅ Username is correct (try email or user ID)
4. ✅ Password meets requirements (min 8 chars, etc.)

### "I don't have AWS CLI"

**Option A: Use Cognito Console**
1. Go to Cognito Console → User Pools → Your Pool → Users
2. Click on the user
3. If "Reset password" is enabled, use it
4. If disabled, you'll need AWS CLI or IAM permissions

**Option B: Ask someone with AWS access**
- Have them run the AWS CLI commands above
- Or give them temporary AWS access

### "User not found" error

**Try:**
- Email address: `josh@galantfoodco.com`
- User ID: `4929a94e-30d1-7072-d9fd-371629866622`
- Check the exact username in Cognito Console

### "Access Denied" when using AWS CLI

**Check IAM permissions:**
```json
{
  "Effect": "Allow",
  "Action": [
    "cognito-idp:AdminSetUserPassword",
    "cognito-idp:AdminGetUser"
  ],
  "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
}
```

---

## 📋 Complete Setup Script

Save this as `fix-login.sh`:

```bash
#!/bin/bash

# Configuration - EDIT THESE
USER_POOL_ID="your-pool-id-here"
USERNAME="josh@galantfoodco.com"
NEW_PASSWORD="YourSecurePassword123!"
REGION="us-west-1"

echo "Step 1: Resetting password for $USERNAME..."
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$USERNAME" \
  --password "$NEW_PASSWORD" \
  --permanent \
  --region "$REGION"

echo "Step 2: Adding to admin group..."
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "$USERNAME" \
  --group-name admin \
  --region "$REGION"

echo ""
echo "✅ Done! You can now log in with:"
echo "   Username: $USERNAME"
echo "   Password: $NEW_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Make sure USER_PASSWORD_AUTH is enabled in Cognito Console!"
```

**To use:**
1. Edit the variables at the top
2. `chmod +x fix-login.sh`
3. `./fix-login.sh`

---

## ✅ Verification Checklist

Before trying to log in, verify:

- [ ] USER_PASSWORD_AUTH is enabled in Cognito app client settings
- [ ] Password has been reset with `--permanent` flag
- [ ] User exists in the correct User Pool
- [ ] Password meets requirements (8+ chars, etc.)
- [ ] Using correct username (email or user ID)

---

## 🎯 Most Likely Issue

**99% of the time, it's because USER_PASSWORD_AUTH is not enabled.**

Even if everything else is correct, login will fail without this setting enabled.

**Fix it first, then try logging in again!**

