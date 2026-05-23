# Apollo DroneWorks Design Guidelines

## Consistent UI Patterns

### Section Headers
All section headings must be placed **inside** their bordered containers, not outside. This creates a clean, consistent visual hierarchy throughout the site.

**Correct Pattern:**
```jsx
<div className="bg-black-light rounded-lg p-6 border border-white/50 mb-8">
  <h2 className="text-2xl font-semibold font-montserrat text-gold-gradient mb-6">
    Section Title
  </h2>
  {/* Section content */}
</div>
```

**Incorrect Pattern:**
```jsx
<h2 className="text-2xl font-semibold font-montserrat text-gold-gradient mb-6">
  Section Title
</h2>
<div className="bg-black-light rounded-lg p-6 border border-white/50 mb-8">
  {/* Section content */}
</div>
```

### Border Styling
All borders throughout the site should use consistent white with 50% opacity:
- `border border-white/50`

### Color Scheme
- Primary Gold: Use `text-gold-gradient` for main headings
- Secondary Gold: Use `gold-text` or `text-gold-light` for subheadings
- Background: `bg-black-light` for content containers
- Text: `text-offwhite` for body text

### Layout Consistency
- All sections should use the bordered container pattern
- Headings should be the first element inside each container
- Maintain consistent spacing with `mb-6` for headings and `mb-8` for containers

This ensures a unified visual experience across all pages and components.