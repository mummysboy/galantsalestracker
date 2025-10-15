# Google Apps Script Migration - Step-by-Step

## ⏱️ Time Required: 10 minutes

Follow these steps exactly to migrate to the new Google Apps Script system.

---

## Step 1: Backup Your Current Sheet (2 minutes)

1. Open your Google Sheet
2. Click **File** → **Make a copy**
3. Name it: "Sales Tracker Backup - [Today's Date]"
4. Close the backup (work on your original)

**Why:** Safety first! If anything goes wrong, you have a backup.

---

## Step 2: Update the Apps Script (3 minutes)

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. You'll see the current script code
3. **Select all** the code (Ctrl+A on Windows, Cmd+A on Mac)
4. **Delete** it
5. Open the file `UPDATED_GOOGLE_APPS_SCRIPT.js` on your computer
6. **Copy all** the code from that file
7. **Paste** it into the Apps Script editor
8. Click **💾 Save** (or Ctrl+S / Cmd+S)
9. Wait for "Saved" to appear

**Checkpoint:** You should see the new code in the editor with functions like `processVendorUpload`, `viewUploadedData`, etc.

---

## Step 3: Clear Old Data (2 minutes)

1. Still in the Apps Script editor, look at the top toolbar
2. Find the function dropdown (it might say "doGet" or "doPost")
3. Click it and select **clearAllData**
4. Click the **▶ Run** button
5. If prompted for authorization:
   - Click **Review Permissions**
   - Choose your Google account
   - Click **Advanced** → **Go to [Project Name] (unsafe)** → **Allow**
6. Wait for it to complete (5-10 seconds)
7. Click **View** → **Logs** to confirm it worked
   - You should see "All vendor data cleared"

**Why:** This removes any old data that may have been duplicated or had incorrect case counts.

---

## Step 4: Verify the Clear (1 minute)

1. Go back to your Google Sheet (the tab/window with your spreadsheet)
2. Look at the vendor tabs (Alpine, KeHe, Vistar, etc.)
3. They should be mostly empty or show only headers

**Checkpoint:** Sheets should be cleared out.

---

## Step 5: Re-upload Your Data (5-10 minutes)

1. Open your **SalesTracker app** (the React app)
2. Go to each vendor's upload section
3. Upload the reports you want (one month at a time or multiple)
   - For September: Upload your September report
   - For multiple months: Upload July, August, September, etc.
4. Wait for "Processing Complete! 🎉" after each upload

**Tip:** Start with one vendor and one month to test, then do the rest.

---

## Step 6: Verify the Data (2 minutes)

1. Go back to your Google Sheet
2. Look at a vendor tab you just uploaded (e.g., KeHe)
3. You should see:
   - **MONTHLY SALES OVERVIEW** section at the top
   - **Total Cases** row showing data in the month column you uploaded
   - Other months showing 0 (if you haven't uploaded them yet)
   - **SALES BY CUSTOMER & PRODUCT** section with your detailed data

**Checkpoint:** Data should show only for the months you uploaded.

---

## Step 7: Check Upload Metadata (1 minute)

1. Go back to Apps Script editor
2. Select **viewUploadedData** from the function dropdown
3. Click **▶ Run**
4. Click **View** → **Logs**
5. You should see a list of what you've uploaded:
   ```
   📊 KeHe
      • 2025-09: 150 records - uploaded Oct 15, 2025...
   ```

**Checkpoint:** Logs show accurate upload history.

---

## Step 8: Test Replace Behavior (2 minutes)

1. In your SalesTracker app, upload the **same month** for the same vendor again
2. Wait for processing to complete
3. Go to Google Sheet and check that vendor's tab
4. The numbers should be **the same** (not doubled!)

**Checkpoint:** Re-uploading doesn't duplicate data.

---

## ✅ Migration Complete!

You're now using the new system. Here's what changed:

### Old Behavior
- ❌ Accumulated all data forever
- ❌ Duplicated data if uploaded twice
- ❌ Showed all months even when uploading one

### New Behavior
- ✅ Only stores months you upload
- ✅ Replaces data if uploaded twice
- ✅ Shows only uploaded months

---

## 🎯 What to Do Next

### Daily Use
- Upload reports as normal in your SalesTracker app
- Check Google Sheets for the monthly view
- No manual clearing needed!

### If You Need to Fix Something
```javascript
// View what's uploaded
viewUploadedData()

// Clear a specific month
clearMonthData("KeHe", 2025, 9)

// Clear a vendor
clearVendorData("KeHe")
```

### Learn More
- **Quick commands:** `SCRIPT_QUICK_REFERENCE.md`
- **Full guide:** `GOOGLE_APPS_SCRIPT_OVERHAUL_GUIDE.md`
- **Summary:** `GOOGLE_SHEETS_OVERHAUL_SUMMARY.md`

---

## ⚠️ Troubleshooting

### "I don't see clearAllData in the dropdown"

**Solution:** 
1. Make sure you saved the new script (Step 2)
2. Refresh the Apps Script page
3. Check that you pasted the entire new script

### "Authorization required" popup keeps appearing

**Solution:**
1. Click **Review Permissions**
2. Select your Google account
3. Click **Advanced**
4. Click **Go to [Project Name] (unsafe)**
5. Click **Allow**
6. This is normal - Google requires permission for scripts to access sheets

### "Data still looks wrong after clearing"

**Solution:**
1. Make sure you ran `clearAllData()` (Step 3)
2. Verify sheets are empty (Step 4)
3. Re-upload from the app (Step 5)
4. If still wrong, check your source Excel/CSV files

### "Upload from app isn't working"

**Solution:**
1. Check browser console (F12) for errors
2. Verify your `.env` file has the correct `REACT_APP_GS_WEBAPP_URL`
3. The web app URL should still work (you didn't need to redeploy)

### "Numbers don't match between Dashboard and Google Sheets"

**For the same month:**
- Should match exactly now
- If not, clear that month and re-upload

**For different months:**
- Dashboard shows one period at a time
- Google Sheets shows all uploaded periods

### "Function ran but nothing happened"

**Solution:**
1. Check **View** → **Logs** for error messages
2. Make sure you selected the right function
3. Try refreshing the Google Sheet

---

## 📞 Still Need Help?

1. **Read the logs:**
   - Apps Script: View → Logs
   - Google Sheet: "Logs" tab

2. **Check metadata:**
   ```javascript
   viewUploadedData()
   ```

3. **Start completely fresh:**
   ```javascript
   clearAllData()
   // Then re-upload everything
   ```

4. **Verify source files:**
   - Check dates are YYYY-MM-DD
   - Check case counts look correct
   - Check customer names are consistent

---

## 🎉 You're Done!

Your Google Sheets integration is now:
- ✅ Accurate
- ✅ Predictable
- ✅ Easy to maintain
- ✅ Safe to re-upload data

**Enjoy your fixed integration!** 🚀

---

**Migration Date:** October 15, 2025  
**Script Version:** 2.0 (Overhaul)  
**Status:** Complete

