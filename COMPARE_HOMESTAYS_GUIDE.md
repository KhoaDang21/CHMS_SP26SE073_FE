# Compare Homestays Feature Guide

## Overview

Tính năng **Compare Homestays** cho phép khách hàng (customer/guest) so sánh tối đa 4 homestay cùng lúc để dễ dàng chọn lựa.

## Files Created/Modified

### 1. API Config

- **File**: `src/config/apiConfig.ts`
- **Change**: Thêm endpoint

```typescript
publicHomestays: {
  reviews: (homestayId: string) => `/api/public/homestays/${homestayId}/reviews`,
  compare: "/api/public/homestays/compare",
}
```

### 2. Service Function

- **File**: `src/services/publicHomestayService.ts`
- **Added Function**: `compare(homestayIds: string[], customerPreferences?: string)`
  - Input: Array of homestay IDs (max 4) + optional preferences
  - Output: Array of normalized Homestay objects
  - Handles field normalization from different BE response formats

### 3. Compare Modal Component

- **File**: `src/components/customer/CompareHomestaysModal.tsx`
- **Features**:
  - Two-step process: Selection → Comparison
  - Selection view: Checkbox grid to choose 2-4 homestays
  - Comparison view: Horizontal scrolling table
  - Compare fields:
    - Basic: Name, price/night, location, image
    - Details: Max guests, bedrooms, bathrooms, area
    - Amenities: Tag-based display with +N more indicator
    - Ratings: Star rating + review count
    - Policies: Deposit percentage, description
    - Action: "Book Now" button for each homestay

### 4. Favorites Page Integration

- **File**: `src/pages/customer/FavoritesPage.tsx`
- **Changes**:
  - Import CompareHomestaysModal
  - Add "So sánh" button (visible only if 2+ favorites)
  - Pass available homestays to modal
  - Handle booking redirection

## Usage

### Integrate into Other Pages

To add compare functionality to any page showing homestays:

```typescript
import { useState } from 'react';
import CompareHomestaysModal from '../../components/customer/CompareHomestaysModal';
import { Scale } from 'lucide-react';

function MyPage() {
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [homestays, setHomestays] = useState([]);

  return (
    <>
      <button
        onClick={() => setIsCompareOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg"
      >
        <Scale className="w-4 h-4" />
        So sánh
      </button>

      <CompareHomestaysModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        availableHomestays={homestays}
        onBooking={(homestayId) => {
          // Handle navigation to detail or booking page
          navigate(`/homestays/${homestayId}`);
        }}
      />
    </>
  );
}
```

### API Request Format

```typescript
// Service usage:
const result = await publicHomestayService.compare(
  ["id-1", "id-2", "id-3"],
  "I prefer budget homestays with beach view", // optional
);
```

### API Endpoint

```
POST /api/public/homestays/compare

Request Body:
{
  "homestayIds": ["id-1", "id-2", "id-3"],
  "customerPreferences": "optional string" (optional)
}

Response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "...",
      "pricePerNight": 100,
      "maxGuests": 4,
      "bedrooms": 2,
      "bathrooms": 1,
      "amenities": ["WiFi", "Air Conditioning", ...],
      ...
    }
  ]
}
```

## Design Details

### Component Props

```typescript
interface CompareHomestaysModalProps {
  isOpen: boolean; // Control modal visibility
  onClose: () => void; // Callback when modal closes
  availableHomestays: Homestay[]; // List to choose from
  onBooking?: (homestayId: string) => void; // Callback when user clicks "Book Now"
}
```

### UI Features

1. **Selection Step**
   - Grid layout (3 columns on desktop)
   - Show homestay thumbnail + name + price + rating
   - Checkbox for selection
   - Maximum 4 can be selected

2. **Comparison Step**
   - Horizontal scrolling table
   - Sticky left column for row labels
   - 12 comparison rows:
     - Image (image preview)
     - Name
     - Price per Night
     - Location
     - Rating
     - Max Guests
     - Bedrooms
     - Bathrooms
     - Area
     - Amenities (with tag display)
     - Description
     - Deposit %
     - Action (Book Now button)

3. **Responsive**
   - Mobile: Full width modal with scrollable table
   - Desktop: Max width 7xl container

## Future Enhancements

1. Add to Explore/Search results page
2. Add quick compare button on homestay cards
3. Save comparison for later
4. Export comparison as PDF
5. Filter comparison rows
6. Show price trends over dates
7. Add reviews section to comparison

## Testing Checklist

- [ ] Select 2-4 homestays from favorites
- [ ] Click "So sánh" button
- [ ] Verify selection grid shows all homestays
- [ ] Verify max 4 selection limit
- [ ] Click Compare to go to comparison view
- [ ] Verify all comparison fields display correctly
- [ ] Scroll through comparison table horizontally
- [ ] Click "Book Now" button
- [ ] Verify navigation to homestay detail
- [ ] Click "Back" to return to selection
- [ ] Test modal close button
- [ ] Test with 2, 3, and 4 homestays
