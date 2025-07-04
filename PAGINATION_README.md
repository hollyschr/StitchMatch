# Pagination Implementation for StitchMatch Search

## Overview

Pagination has been implemented for the StitchMatch search functionality to improve performance and user experience when dealing with large result sets.

## Backend Changes

### New Response Model
- Added `PaginatedPatternResponse` model that includes:
  - `patterns`: Array of pattern objects
  - `pagination`: Object with pagination metadata

### Updated Endpoints
1. **`GET /patterns/`** - Now supports pagination parameters:
   - `page` (default: 1) - Current page number
   - `page_size` (default: 30) - Number of patterns per page
   - All existing filter parameters remain unchanged

2. **`GET /patterns/stash-match/{user_id}`** - Now supports pagination:
   - `page` (default: 1) - Current page number
   - `page_size` (default: 30) - Number of patterns per page

### Pagination Metadata
Each response includes pagination information:
```json
{
  "patterns": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## Frontend Changes

### New State Variables
- `currentPage`: Tracks current page number
- `paginationInfo`: Stores pagination metadata
- `showLoadMore`: Toggle between traditional pagination and "Load More" mode

### User Interface Options
1. **Traditional Pagination**: 
   - Full pagination controls at the top with page numbers
   - Compact navigation at the bottom (Previous/Next only)
   - Automatic scroll to top when changing pages
2. **Load More**: Single button that appends new results to existing ones
3. **Back to Top**: Floating button appears when scrolling down

### Features
- **Page Size**: 30 patterns per page (configurable)
- **Dual Navigation**: Pagination controls at both top and bottom of results
- **Smart Page Numbers**: Shows up to 5 page numbers with ellipsis for large result sets
- **Results Counter**: Shows "Page X of Y • Z total patterns"
- **Loading States**: Proper loading indicators during page transitions
- **Smooth Scrolling**: Automatically scrolls to top when navigating pages
- **Back to Top Button**: Floating button appears when scrolling down
- **Responsive Design**: Works on mobile and desktop

## Performance Benefits

### Before Pagination
- All patterns loaded at once (could be 1000+ patterns)
- N+1 query problem in database
- High memory usage
- Slow initial load times

### After Pagination
- Only 30 patterns loaded per request
- Reduced database queries
- Lower memory usage
- Fast initial load times
- Better scalability

## Usage

### For Users
1. **Traditional Pagination**: Use Previous/Next buttons or click page numbers
2. **Load More**: Check "Load more (instead of pagination)" checkbox for infinite scroll-like experience

### For Developers
- Backend automatically handles pagination when `page` and `page_size` parameters are provided
- Frontend automatically updates URL parameters for bookmarkable pages
- Pagination state is preserved during filter changes

## Technical Details

### Database Queries
- Uses SQL `LIMIT` and `OFFSET` for efficient pagination
- Total count query runs separately for accurate pagination info
- All existing filters work with pagination

### Error Handling
- Graceful handling of invalid page numbers
- Proper loading states during transitions
- Fallback to empty results for edge cases

## Future Enhancements

1. **Infinite Scroll**: Could replace "Load More" button with automatic loading
2. **Caching**: Implement Redis caching for frequently accessed pages
3. **Search Highlighting**: Highlight search terms in results
4. **Sorting**: Add sorting options that work with pagination
5. **URL State**: Preserve pagination state in browser URL

## Testing

To test pagination:
1. Start the backend server
2. Navigate to the search page
3. Perform a search that returns many results
4. Test both traditional pagination and "Load More" modes
5. Verify that filters work correctly with pagination
6. Check that pagination state is preserved when switching between modes 