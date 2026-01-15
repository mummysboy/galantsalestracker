# Admin Group Setup - Fix Empty Groups Array

## Problem
Console shows: `Found groups: Array(0)` - This means the JWT token doesn't include group information.

## Solution: Configure Cognito to Include Groups in ID Token

### Step 1: Verify User is in Admin Group

1. Go to **AWS Cognito Console** → **User Pools** → Your User Pool
2. Click **"Users"** tab
3. Find and click on `josh@galantfoodco.com`
4. Scroll to **"Group memberships"** section
5. Verify you see **"admin"** listed
6. If not, add the user to the admin group (see below)

### Step 2: Configure App Client to Include Groups in ID Token

**This is the critical step!** Even if the user is in the admin group, the JWT won't include it unless configured:

1. Go to **AWS Cognito Console** → **User Pools** → Your User Pool
2. Click **"App integration"** tab
3. Find your app client (Client ID: `4h4at7v8icke8k9r6ma0jn61kr`)
4. Click on the app client name
5. Scroll down to **"Attribute read and write permissions"**
6. Look for **"Read attributes"** section
7. **Make sure nothing is blocking group claims**

### Step 3: Configure Token Claims (Most Important!)

1. Still in the app client settings
2. Scroll to **"Token expiration"** section (or look for **"Token settings"**)
3. Click **"Edit"** or find **"Advanced app client settings"**
4. Look for **"Read attributes"** or **"Token claims"**
5. **Enable "cognito:groups"** in the ID token claims

**OR use the following method:**

1. In the app client settings, look for **"Advanced app client settings"** or **"Token settings"**
2. Find **"Read attributes"** - make sure it's not restricting anything
3. Look for **"Token expiration"** → **"ID token"** settings
4. Ensure **"Include user attributes in ID token"** is enabled
5. **Most importantly**: Check if there's a setting for **"Include groups in ID token"** or **"cognito:groups"** - enable it

### Step 4: Alternative - Use User Pool Attributes

If the above doesn't work, you may need to configure the User Pool itself:

1. Go to **User Pools** → Your Pool → **"Sign-in experience"** tab
2. Click **"Attributes"**
3. Make sure **"Groups"** is enabled as a readable attribute
4. Go to **"App clients"** → Your app client
5. Under **"Attribute read and write permissions"**, ensure groups can be read

### Step 5: Log Out and Log Back In

After making changes:

1. **Log out** of the app
2. **Log back in** as `josh@galantfoodco.com`
3. Check the console - you should now see: `Found groups: Array(1)` with `["admin"]`
4. Admin cards should appear at the top of the dashboard

## Quick Check via AWS CLI

If you have AWS CLI, you can verify the user is in the group:

```bash
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id YOUR_POOL_ID \
  --username josh@galantfoodco.com \
  --region us-west-1
```

And add to group if needed:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_POOL_ID \
  --username josh@galantfoodco.com \
  --group-name admin \
  --region us-west-1
```

## Most Common Issue

**The app client isn't configured to include `cognito:groups` in the ID token.**

This is a common Cognito configuration issue. The groups exist, but they're not being included in the JWT token that gets sent to your app.

## After Fixing

Once groups are included in the token:
- Console will show: `Found groups: ["admin"]`
- `isAdminSession` will be `true`
- Admin cards will appear at the top of the dashboard



