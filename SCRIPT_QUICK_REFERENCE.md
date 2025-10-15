# Google Apps Script - Quick Reference Card

## 🔧 Common Tasks

### View What's Been Uploaded
```javascript
viewUploadedData()
```
**Result:** Shows all vendors, months, and upload dates

---

### Clear One Month from One Vendor
```javascript
clearMonthData("KeHe", 2025, 9)
```
**Parameters:**
- Vendor name (exact match: "KeHe", "Alpine", "Pete's Coffee", "Vistar", "Tony's Fine Foods", "Troia Foods", "Mike Hudson")
- Year (4 digits: 2025)
- Month (1-12: 9 for September)

---

### Clear All Data from One Vendor
```javascript
clearVendorData("KeHe")
```
**Use when:** You want to re-upload all months for a vendor from scratch

---

### Clear Everything
```javascript
clearAllData()
```
**Use when:** Starting completely fresh with all vendors

---

## 📋 How to Run Functions

### In Google Apps Script Editor:

1. Open your Google Sheet
2. Click **Extensions** → **Apps Script**
3. Find the function dropdown (top toolbar, near the ▶ Run button)
4. Select the function you want to run
5. Click **▶ Run**
6. Click **View** → **Logs** to see the results

### Running Functions with Parameters:

For functions that need parameters (like `clearMonthData`), you need to:

1. Click on the function name in the code
2. Add this test function at the bottom of the script:

```javascript
function testClearMonth() {
  clearMonthData("KeHe", 2025, 9);
}
```

3. Select `testClearMonth` from the dropdown
4. Click **▶ Run**

---

## 🎯 Common Scenarios

### Scenario 1: I uploaded the wrong file
```javascript
// Clear the month you uploaded
clearMonthData("KeHe", 2025, 9)

// Then upload the correct file from your app
```

### Scenario 2: Numbers look wrong for a vendor
```javascript
// Clear that vendor completely
clearVendorData("KeHe")

// Re-upload all reports for that vendor
```

### Scenario 3: I want to start over completely
```javascript
// Clear everything
clearAllData()

// Upload all your reports from scratch
```

### Scenario 4: I want to see what I've uploaded
```javascript
// View upload history
viewUploadedData()

// Check the Logs section for output
```

### Scenario 5: I uploaded September twice by accident
**No action needed!** The script automatically replaced the first upload with the second.

---

## 🔍 Checking Results

### After Running a Function:

1. **Check Logs:**
   - Apps Script: **View** → **Logs**
   - Look for confirmation messages

2. **Check Metadata:**
   ```javascript
   viewUploadedData()
   ```

3. **Check Google Sheet:**
   - Go to the vendor's tab
   - Verify the monthly view looks correct
   - Months with 0 cases = not uploaded

---

## ⚠️ Important Notes

- **Vendor names must be exact:** "KeHe" not "kehe" or "KEHE"
- **Month is a number:** 1-12, not "January" or "01"
- **Clearing cannot be undone:** Always keep your original files
- **Uploads auto-replace:** You don't need to clear before uploading the same month again

---

## 📝 Vendor Name Reference

| Use This Exact Name | For |
|-------------------|-----|
| `Alpine` | Alpine reports |
| `Pete's Coffee` | Pete's Coffee reports |
| `KeHe` | KeHe reports |
| `Vistar` | Vistar reports |
| `Tony's Fine Foods` | Tony's reports |
| `Troia Foods` | Troia reports |
| `Mike Hudson` | MHD reports |

---

## 🐛 Troubleshooting

**"ReferenceError: clearMonthData is not defined"**
→ Make sure you've saved the updated script (💾 Save button)

**"Exception: Service Spreadsheets failed"**
→ Wait a moment and try again (Google API timeout)

**"No data to clear"**
→ The vendor/month you specified has no data (this is OK)

**Function runs but nothing changes**
→ Check View → Logs for error messages

---

## 💡 Pro Tips

1. **Always view metadata first:**
   ```javascript
   viewUploadedData()
   ```
   Know what's there before clearing!

2. **Test with one vendor:**
   Clear and re-upload one vendor to verify the system works before doing all vendors.

3. **Keep a log:**
   Note which files you've uploaded and when. The metadata helps, but your own notes are good too.

4. **One month at a time:**
   When fixing issues, handle one month at a time to avoid confusion.

5. **Verify after clearing:**
   After clearing, check the Google Sheet to confirm the data is gone before re-uploading.

---

## 📱 Quick Command List

```javascript
// View
viewUploadedData()

// Clear specific month
clearMonthData("KeHe", 2025, 9)

// Clear vendor
clearVendorData("KeHe")

// Clear everything
clearAllData()
```

---

## 🔗 Related Documentation

- **Full Guide:** See `GOOGLE_APPS_SCRIPT_OVERHAUL_GUIDE.md`
- **Script File:** `UPDATED_GOOGLE_APPS_SCRIPT.js`

---

**Last Updated:** October 2025

