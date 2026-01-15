# Password Reset Guide

## Issue: "Reset password" is disabled in Cognito Console

If the "Reset password" option is grayed out in the Cognito Console, use one of these alternatives:

---

## ✅ Solution 1: Use the App's Admin Panel (Recommended)

The app has built-in password reset functionality that works even when the console option is disabled.

### Steps:

1. **Log in as an admin user** (a user who is already in the admin group)

2. **Navigate to the admin panel** - You should see "User management" section at the top

3. **Use "Reset user password" section:**
   - Enter the username (can be email like `josh@galantfoodco.com` or the user ID)
   - Enter a new password (minimum 8 characters)
   - Click "Reset password"

4. **The user can now log in** with the new password

### Why this works:
- Uses AWS SDK directly with your credentials
- Bypasses console restrictions
- Sets password as permanent (removes "Force change password" status)

---

## ✅ Solution 2: AWS CLI

If you have AWS CLI configured, you can reset passwords from the command line:

```bash
# Set a permanent password for a user
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username josh@galantfoodco.com \
  --password "NewPassword123!" \
  --permanent
```

**Replace:**
- `YOUR_USER_POOL_ID` with your actual User Pool ID
- `josh@galantfoodco.com` with the actual username
- `NewPassword123!` with the desired password

---

## ✅ Solution 3: Fix IAM Permissions

If you need to use the console, ensure your IAM user/role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes"
      ],
      "Resource": "arn:aws:cognito-idp:REGION:ACCOUNT_ID:userpool/USER_POOL_ID"
    }
  ]
}
```

**To add permissions:**
1. Go to IAM Console → Users → Your User
2. Click "Add permissions" → "Attach policies directly"
3. Create a new policy with the above JSON
4. Or attach `AmazonCognitoPowerUser` policy (if appropriate for your security needs)

---

## ✅ Solution 4: Use "Force change password" Flow

If a user has "Force change password" status, they can change it themselves:

1. User attempts to log in with their temporary password
2. App will show a "Set New Password" form
3. User enters a new password
4. User can then log in normally

**Note:** This only works if the user knows their temporary password.

---

## Troubleshooting

### "Only admins can reset passwords" error in app

**Solution:** Make sure you're logged in as a user who is in the admin group.

### "User not found" error

**Solutions:**
- Try using the email address instead of user ID
- Try using the user ID (the long UUID)
- Check the username is exactly as it appears in Cognito (case-sensitive)

### "Failed to reset password. Check AWS permissions" error

**Solutions:**
1. Verify your AWS credentials in `.env` file:
   ```env
   REACT_APP_AWS_ACCESS_KEY_ID=your_key
   REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret
   REACT_APP_AWS_REGION=us-west-1
   ```

2. Check IAM permissions (see Solution 3 above)

3. Verify the User Pool ID is correct:
   ```env
   REACT_APP_COGNITO_USER_POOL_ID=your_pool_id
   ```

### Password doesn't meet requirements

**Requirements:**
- Minimum 8 characters
- Must meet your User Pool's password policy
- Check User Pool → Policies → Password policy in Cognito Console

---

## Quick Reference

### For the user: `josh@galantfoodco.com` (ID: `4929a94e-30d1-7072-d9fd-371629866622`)

**Via App:**
1. Log in as admin
2. Go to "Reset user password"
3. Username: `josh@galantfoodco.com` or `4929a94e-30d1-7072-d9fd-371629866622`
4. Set new password
5. Click "Reset password"

**Via AWS CLI:**
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_POOL_ID \
  --username josh@galantfoodco.com \
  --password "NewSecurePassword123!" \
  --permanent
```

---

## Why Console Option Might Be Disabled

Common reasons:
1. **IAM Permissions:** Your IAM user doesn't have `cognito-idp:AdminSetUserPassword` permission
2. **Console Restrictions:** Some Cognito console features require specific roles
3. **User Pool Settings:** Certain User Pool configurations may restrict console operations
4. **Account Type:** Some AWS account types have restrictions

**Workaround:** Use the app's admin panel or AWS CLI instead (both work regardless of console restrictions).



