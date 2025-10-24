# Loading Overlay - Quick Reference

## What Was Added?
A beautiful, full-screen loading overlay that appears when:
1. **Uploading files** - Shows upload progress with steps
2. **Deleting data** - Shows deletion progress with steps

## User Sees
✅ Full-screen overlay blocking interaction
✅ Large animated spinner
✅ Clear title: "Processing Upload..." or "Processing Deletion..."
✅ What's happening at each stage
✅ Strong warning: "Do not refresh, close, or navigate away"
✅ Overlay stays visible for entire duration
✅ Disappears automatically when done

## Where It Appears
- **Position**: Center of screen, full overlay
- **Z-Index**: Highest level (10005) - overlays everything
- **Backdrop**: Dark semi-transparent background
- **Modal**: White rounded card with content

## Design Highlights

### Upload Mode
```
Processing Upload...
Uploading file to database

[Processing steps shown as list]
✓ Parsing file...
✓ Deduplicating records...
✓ Uploading to database...
✓ Updating progressions...

⚠️ Do not refresh, close, or navigate away
```

### Deletion Mode
```
Processing Deletion...
Removing data from database

[Processing steps shown as list]
✓ Deleting from database...
✓ Updating dashboard...

⚠️ Do not refresh, close, or navigate away
```

## How It Works

### Technical Flow
1. User initiates upload/deletion
2. Component calls `onUploadStart()` or sets `isDeleting = true`
3. Dashboard detects state change
4. Overlay appears instantly
5. Upload/deletion happens in background
6. Component calls `onUploadEnd()` or sets `isDeleting = false`
7. Overlay disappears

### State Management
```typescript
// In Dashboard.tsx
const [isUploading, setIsUploading] = useState(false);
const [uploadDescription, setUploadDescription] = useState('');
const [isDeleting, setIsDeleting] = useState(false);

// Render overlay if either is true
if (isDeleting || isUploading) {
  // Show comprehensive overlay
}
```

## Files Modified
1. **src/Dashboard.tsx**
   - Added `isUploading`, `uploadDescription`, `isDeleting` states
   - Replaced deletion overlay with comprehensive processing overlay
   - Added callbacks to all upload components

2. **All Upload Components**
   - Added three new optional props: `onUploadStart`, `onUploadDescription`, `onUploadEnd`
   - Updated to call these callbacks at appropriate times

## Styling
- **Overlay Background**: Black with 60% opacity
- **Modal Background**: White with rounded corners
- **Spinner**: Blue-600 animated dual-ring
- **Steps**: Blue-600 checkmarks in light gray background
- **Warning**: Amber-600 banner with warning icon

## Browser Support
✅ All modern browsers (Chrome, Firefox, Safari, Edge)
✅ Mobile responsive
✅ Tablet optimized
✅ Full-screen overlay works on all sizes

## Key Features
- ✅ Cannot interact with page while overlay is visible
- ✅ Clear visual feedback of processing
- ✅ Progress steps visible
- ✅ Strong warning against page refresh
- ✅ Automatic dismissal when complete
- ✅ Works for both uploads and deletions
- ✅ Custom messages supported for uploads

---
**Status**: ✅ Ready for Production
**Last Updated**: October 24, 2025
