# Admin Login Setup Guide

## Problem: Need Admin Password to Log In

If you don't know the admin password, here are your options:

---

## ✅ Option 1: Reset Password via AWS CLI (Fastest)

If you have AWS CLI configured with admin credentials:

```bash
# Replace with your actual values
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --password "YourNewPassword123!" \
  --permanent \
  --region us-west-1
```

**To find your User Pool ID:**
- Check your `.env` file for `REACT_APP_COGNITO_USER_POOL_ID`
- Or go to Cognito Console → User Pools → Your Pool → General settings

**Then:**
1. Log in to the app with username `admin` and the new password
2. Add yourself to the admin group (if not already added)

---

## ✅ Option 2: Create New Admin User via AWS CLI

If no admin user exists:

```bash
# Create the user
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --user-attributes Name=email,Value=your-email@example.com \
  --message-action SUPPRESS \
  --region us-west-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --password "YourNewPassword123!" \
  --permanent \
  --region us-west-1

# Add to admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin \
  --group-name admin \
  --region us-west-1
```

---

## ✅ Option 3: Use Existing User and Add to Admin Group

If you have ANY user that can log in:

1. **Log in with that user** (even if not admin yet)
2. **Add yourself to admin group via Cognito Console:**
   - Go to Cognito Console → User Pools → Your Pool
   - Click "Groups" → "admin" group
   - Click "Add user to group"
   - Select your user
   - Click "Add"

3. **Log out and log back in** - You'll now have admin access

---

## ✅ Option 4: Reset Password via Cognito Console

If you have console access:

1. Go to Cognito Console → User Pools → Your Pool
2. Click "Users" tab
3. Find the admin user (or any user)
4. Click on the user
5. Click "Actions" → If "Reset password" is enabled, use it
6. If disabled, use AWS CLI (Option 1) instead

---

## ✅ Option 5: Use One of Your Existing Users

Based on your earlier screenshots, you have these users:
- `josh@galantfoodco.com` (ID: `4929a94e-30d1-7072-d9fd-371629866622`)
- `isaac@rightimagedigital.com` (ID: `8999591e-20f1-70d4-4d12-365ef61d63aa`)
- `isaachirsch@gmail.com` (ID: `e999a96e-a021-701d-5b2e-3b20d3349b47`)

**If any of these can log in:**

1. Log in with that user
2. Add them to admin group (via console or CLI)
3. Log out and back in
4. Now you have admin access to reset other passwords

---

## Quick Setup Script

Save this as `setup-admin.sh` and run it:

```bash
#!/bin/bash

# Set these variables
USER_POOL_ID="your-pool-id-here"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="YourSecurePassword123!"
ADMIN_EMAIL="your-email@example.com"
REGION="us-west-1"

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_USERNAME" \
  --user-attributes Name=email,Value="$ADMIN_EMAIL" \
  --message-action SUPPRESS \
  --region "$REGION"

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_USERNAME" \
  --password "$ADMIN_PASSWORD" \
  --permanent \
  --region "$REGION"

# Add to admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "$ADMIN_USERNAME" \
  --group-name admin \
  --region "$REGION"

echo "Admin user created! Username: $ADMIN_USERNAME, Password: $ADMIN_PASSWORD"
```

**To use:**
1. Edit the variables at the top
2. Make executable: `chmod +x setup-admin.sh`
3. Run: `./setup-admin.sh`

---

## Finding Your User Pool ID

Check your `.env` file:
```bash
grep COGNITO_USER_POOL_ID .env
```

Or check `env.example`:
```bash
cat env.example | grep COGNITO_USER_POOL_ID
```

---

## After Setting Up Admin

Once you can log in as admin:

1. **Reset other users' passwords** using the admin panel
2. **Add users to groups** using the admin panel
3. **Create new users** using the admin panel

All of this is available in the app's admin section once you're logged in!

---

## Security Note

**Never share passwords or commit them to git!**

- Use strong passwords (min 8 chars, mix of upper/lower/numbers/symbols)
- Store passwords securely (password manager)
- Rotate passwords regularly
- Use environment variables, never hardcode

