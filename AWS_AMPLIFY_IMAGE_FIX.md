# AWS Amplify Image Fix - Rewrite Rules Configuration

## Problem
AWS Amplify is serving `index.html` for image requests instead of the actual image files. This is because the SPA routing is catching all requests.

## Solution: Configure Rewrite Rules in AWS Amplify Console

You need to configure rewrite rules in the AWS Amplify Console to serve static files before routing to index.html.

### Steps:

1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify
2. Select your app: `galantsalestracker` (or your app name)
3. Go to **Rewrites and redirects** in the left sidebar
4. Add the following rewrite rules (in this order):

#### Rule 1: Serve static files directly
```
Source: /static/<*>
Target: /static/<*>
Type: 200 (Rewrite)
```

#### Rule 2: Serve image files directly
```
Source: /<*>.avif
Target: /<*>.avif
Type: 200 (Rewrite)
```

#### Rule 3: Serve other static files
```
Source: /<*>.png
Target: /<*>.png
Type: 200 (Rewrite)
```

```
Source: /<*>.jpg
Target: /<*>.jpg
Type: 200 (Rewrite)
```

```
Source: /<*>.jpeg
Target: /<*>.jpeg
Type: 200 (Rewrite)
```

```
Source: /<*>.svg
Target: /<*>.svg
Type: 200 (Rewrite)
```

```
Source: /<*>.ico
Target: /<*>.ico
Type: 200 (Rewrite)
```

#### Rule 4: SPA Fallback (must be last)
```
Source: /<*>
Target: /index.html
Type: 200 (Rewrite)
```

### Alternative: Single Regex Rule

You can also use a single regex rule that excludes static file extensions:

```
Source: </^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|ttf|map|json|avif|webp)$)([^.]+$)/>
Target: /index.html
Type: 200 (Rewrite)
```

This rule routes all requests to index.html EXCEPT for files with the specified extensions (which will be served directly).

## After Configuration

1. Save the rewrite rules
2. AWS Amplify will automatically redeploy
3. The image should now load correctly at: `https://main.dbqznmct8mzz4.amplifyapp.com/galantfoodco.avif`

## Verification

Test the image URL directly:
```bash
curl -I https://main.dbqznmct8mzz4.amplifyapp.com/galantfoodco.avif
```

You should see `content-type: image/avif` instead of `content-type: text/html`.

