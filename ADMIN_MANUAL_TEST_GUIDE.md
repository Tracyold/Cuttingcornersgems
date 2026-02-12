# 🧪 Admin Manual Test Guide - Mobile & Desktop

**Last Updated**: Current Session  
**App URL**: https://journey-ui-sandbox.preview.emergentagent.com  
**Admin URL**: https://journey-ui-sandbox.preview.emergentagent.com/admin

---

## 🔐 Admin Credentials

- **Username**: `postvibe`
- **Password**: `adm1npa$$word`

---

## ✅ Test 1: Gallery Item Creation (Admin → Mobile & Desktop)

### **Objective**: Verify gallery items created in admin display correctly on both mobile and desktop

### **Steps**:

#### **1. Login to Admin Panel**
- Navigate to `/admin`
- Enter credentials
- Click "Sign In"
- Should redirect to `/admin/dashboard`

#### **2. Go to Gallery Management**
- Click "Gallery" in sidebar
- Should see `/admin/gallery` page with existing items

#### **3. Create Single Gallery Item**
- Click **"Add Item"** button (NOT "Bulk Add")
- Fill in the form with test data:
  ```
  Title: Test Mobile Gallery Item
  Category: sapphire
  Gem Type: Blue Sapphire
  Color: Deep Blue
  Carat: 3.5ct
  Dimensions: 10x8mm
  Description: Test item for mobile display verification
  Main Image URL: https://images.unsplash.com/photo-1605821771565-35e0d046a2fb?w=800
  Featured: ☐ (unchecked)
  ```
- Click **"Create"**
- Should see success toast
- New item should appear in gallery grid

#### **4. Verify Desktop Display**
- Open new tab → Navigate to `/gallery`
- **Desktop View** (screen width > 768px):
  - Should see category sidebar on left
  - Should see grid of gallery items on right
  - Find "Test Mobile Gallery Item"
  - **Click the item**
  - Should open **LIGHTBOX popup**
  - Verify lightbox shows:
    - ✓ Image
    - ✓ Title: "Test Mobile Gallery Item"
    - ✓ Category: "sapphire"
    - ✓ Carat: "3.5ct"
    - ✓ Dimensions: "10x8mm"
  - Press ESC or click X to close
  - **PASS**: If all fields display correctly

#### **5. Verify Mobile Display**
- Same `/gallery` page
- **Resize browser to mobile** (< 768px width) OR open on mobile device
- **Mobile View**:
  - Should see 2-column grid (no sidebar)
  - Find "Test Mobile Gallery Item"
  - **Click/Tap the item**
  - Image should disappear, showing info overlay
  - Verify overlay shows:
    - ✓ Category: "SAPPHIRE"
    - ✓ Title: "Test Mobile Gallery Item"
    - ✓ "Gem Type: Blue Sapphire"
    - ✓ "Color: Deep Blue"
    - ✓ "Weight: 3.5ct"
    - ✓ "NOT FOR SALE" (yellow text)
    - ✓ "Tap to close" (small gray text)
  - **Tap again** to close
  - Image should reappear
  - **PASS**: If all fields display correctly

---

## ✅ Test 2: Product Creation (Admin → Mobile & Desktop)

### **Objective**: Verify shop products created in admin display correctly on both mobile and desktop

### **Steps**:

#### **1. Go to Products Management**
- In admin panel, click "Products" in sidebar
- Should see `/admin/products` page

#### **2. Create Single Product**
- Click **"Add Product"** button (NOT "Bulk Add")
- Fill in the form with test data:
  ```
  Title: Test Mobile Product
  Category: tourmaline
  Gem Type: Pink Tourmaline
  Color: Hot Pink
  Carat: 4.2ct
  Dimensions: 12x10mm
  Price Per Carat: 500
  Total Price: 2100
  Description: Mobile product test with full details
  Main Image URL: https://images.unsplash.com/photo-1588444837495-c6cfeb3b1063?w=800
  In Stock: ☑ (checked)
  GIA Certified: ☐ (unchecked)
  Name Your Price: ☐ (unchecked)
  ```
- Click **"Create"**
- Should see success toast
- New product should appear in products list

#### **3. Verify Desktop Display**
- Open new tab → Navigate to `/shop`
- **Desktop View** (screen width > 768px):
  - Should see category filters at top
  - Should see single-column product list
  - Find "Test Mobile Product"
  - **Click the product**
  - Should open **POPUP MODAL**
  - Verify modal shows:
    - ✓ Image carousel
    - ✓ Title: "Test Mobile Product"
    - ✓ Gemstone Type: "Pink Tourmaline"
    - ✓ Color: "Hot Pink"
    - ✓ Carat Weight: "4.2ct"
    - ✓ Measurements: "12x10mm"
    - ✓ Price Per Carat: "$500"
    - ✓ Out The Door Price: "$2,100"
    - ✓ Buttons: "Get Last Refusal" (disabled), "Buy Now", "Inquiry"
  - Click X to close modal
  - **PASS**: If all fields and buttons display correctly

#### **4. Verify Mobile Display**
- Same `/shop` page
- **Resize browser to mobile** (< 768px width) OR open on mobile device
- **Mobile View**:
  - Should see single-column product list (no category filter visible)
  - Find "Test Mobile Product"
  - **Click/Tap the product**
  - Should **NAVIGATE** to dedicated page: `/shop/{product-id}`
  - Verify dedicated page shows:
    - ✓ "Back to Shop" button at top
    - ✓ Full-width image
    - ✓ Image carousel navigation (if multiple images)
    - ✓ All product details in full layout
    - ✓ Gemstone Type: "Pink Tourmaline"
    - ✓ Color: "Hot Pink"
    - ✓ Carat Weight: "4.2ct"
    - ✓ Measurements: "12x10mm"
    - ✓ Price Per Carat: "$500"
    - ✓ Out The Door Price: "$2,100"
    - ✓ Buttons: "Get Last Refusal" (disabled), "Buy Now", "Inquiry"
  - Click "Back to Shop" to return
  - **PASS**: If all fields and buttons display correctly

---

## ✅ Test 3: Bulk Add (Admin → Gallery)

### **Objective**: Verify bulk add works for up to 10 gallery items

### **Steps**:

#### **1. Open Bulk Add Modal**
- In `/admin/gallery`, click **"Bulk Add"** button
- Should open full-screen modal with 2 panels:
  - Left: "Saved Items (0/10)"
  - Right: Form for "Adding item #1"

#### **2. Add First Item**
- Fill form:
  ```
  Title: Bulk Test Item 1
  Category: emerald
  Gem Type: Colombian Emerald
  Color: Green
  Carat: 2.0ct
  Main Image URL: https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=800
  ```
- Click **"Next"**
- Left panel should show "Saved Items (1/10)" with checkmark
- Form should reset for item #2

#### **3. Add Second Item**
- Fill form:
  ```
  Title: Bulk Test Item 2
  Category: tanzanite
  Gem Type: Tanzanite
  Color: Blue-Violet
  Carat: 5.5ct
  Main Image URL: https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=800
  ```
- Click **"Done (2 items)"**
- Should see "2 gallery item(s) added!" toast
- Modal should close
- Both items should appear in gallery grid

#### **4. Verify Both Items on Frontend**
- Navigate to `/gallery` (desktop)
- Find both "Bulk Test Item 1" and "Bulk Test Item 2"
- Click each to verify lightbox displays correctly
- Switch to mobile view
- Click each to verify mobile info overlay shows:
  - ✓ Gem Type
  - ✓ Color
  - ✓ Weight (Carat)
- **PASS**: If both items display all fields correctly

---

## ✅ Test 4: Bulk Add (Admin → Products)

### **Objective**: Verify bulk add works for up to 10 products

### **Steps**:

#### **1. Open Bulk Add Modal**
- In `/admin/products`, click **"Bulk Add"** button
- Should open full-screen modal

#### **2. Add Two Products**
- **Product 1**:
  ```
  Title: Bulk Product 1
  Category: garnet
  Gem Type: Rhodolite Garnet
  Color: Purple-Red
  Carat: 3.0ct
  Price: 900
  Main Image URL: https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=800
  In Stock: ☑
  ```
  - Click "Next"

- **Product 2**:
  ```
  Title: Bulk Product 2
  Category: aquamarine
  Gem Type: Aquamarine
  Color: Sky Blue
  Carat: 6.0ct
  Price: 3600
  Main Image URL: https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800
  In Stock: ☑
  ```
  - Click "Done (2 items)"

#### **3. Verify Both Products**
- Navigate to `/shop` (desktop)
- Find both products
- Click each to verify popup shows all details
- Switch to mobile
- Click each to verify dedicated page shows all details
- **PASS**: If both products display correctly

---

## ✅ Test 5: Fields Optional Behavior

### **Objective**: Verify items work correctly when optional fields are left empty

### **Steps**:

#### **1. Create Gallery Item WITHOUT Optional Fields**
- In `/admin/gallery`, click "Add Item"
- Fill only required fields:
  ```
  Title: Minimal Gallery Item
  Category: sapphire
  Main Image URL: https://images.unsplash.com/photo-1605821771565-35e0d046a2fb?w=800
  ```
- Leave BLANK: Gem Type, Color, Carat, Description
- Click "Create"

#### **2. Verify Mobile Display**
- Navigate to `/gallery` on mobile
- Find "Minimal Gallery Item"
- Click to expand
- Should show:
  - ✓ Category: "SAPPHIRE"
  - ✓ Title: "Minimal Gallery Item"
  - ✓ "NOT FOR SALE"
  - ✓ "Tap to close"
  - ❌ NO "Gem Type:" line (field is empty)
  - ❌ NO "Color:" line (field is empty)
  - ❌ NO "Weight:" line (field is empty)
- **PASS**: If empty fields are hidden (not shown as "null" or "undefined")

#### **3. Create Product WITHOUT Optional Fields**
- In `/admin/products`, click "Add Product"
- Fill only required fields:
  ```
  Title: Minimal Product
  Category: tourmaline
  Price: 1500
  Main Image URL: https://images.unsplash.com/photo-1588444837495-c6cfeb3b1063?w=800
  In Stock: ☑
  ```
- Leave BLANK: Gem Type, Color, Carat, Description
- Click "Create"

#### **4. Verify Mobile Display**
- Navigate to `/shop` on mobile
- Find "Minimal Product"
- Click to open dedicated page
- Should show:
  - ✓ Title: "Minimal Product"
  - ✓ Out The Door Price: "$1,500"
  - ✓ Gemstone Type: "tourmaline" (defaults to category)
  - ✓ Color: "Natural" (default fallback)
  - ✓ Carat Weight: "N/A" (fallback)
- **PASS**: If page displays without errors

---

## 🎯 Expected Results Summary

| Test | Desktop | Mobile |
|------|---------|--------|
| Gallery Item Creation | Lightbox popup with all fields | Info overlay with gem_type, color, weight, "NOT FOR SALE" |
| Product Creation | Modal popup with all fields + buttons | Dedicated page `/shop/:id` with all fields + buttons |
| Bulk Add Gallery | Both items appear in grid | Both items work in mobile view |
| Bulk Add Products | Both items appear in list | Both items work in mobile view |
| Optional Fields | Hidden when empty | Hidden when empty |

---

## 🐛 Common Issues & Troubleshooting

### **Issue: Items not appearing**
- Check browser console for errors
- Verify backend is running: `sudo supervisorctl status backend`
- Check API response: `curl https://journey-ui-sandbox.preview.emergentagent.com/api/gallery`

### **Issue: Mobile view showing desktop layout**
- Verify screen width < 768px
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### **Issue: Fields showing "null" or "undefined"**
- This is a BUG - fields should be hidden when empty
- Report this issue

### **Issue: Animation not working**
- Clear browser cache
- Hard refresh page
- Check if CSS is loaded: Inspect element and verify classes

---

## ✅ Test Completion Checklist

- [ ] Test 1: Gallery creation works on desktop (lightbox)
- [ ] Test 1: Gallery creation works on mobile (info overlay with all fields)
- [ ] Test 2: Product creation works on desktop (popup modal)
- [ ] Test 2: Product creation works on mobile (dedicated page)
- [ ] Test 3: Bulk add gallery items (up to 10) works
- [ ] Test 4: Bulk add products (up to 10) works
- [ ] Test 5: Optional fields hidden when empty
- [ ] Admin login successful
- [ ] All buttons functional (Buy Now, Inquiry, etc.)
- [ ] Images load correctly
- [ ] No console errors
- [ ] Mobile/Desktop responsive switching works

---

**All tests passing? ✅ Admin → Frontend flow is working correctly!**
