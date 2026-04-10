# Light Mode Development Guide

## Overview

This guide provides best practices for maintaining and extending the light mode glassmorphism design in the MOS Admin Panel.

---

## Core Principles

### 1. **Frosted Glass Hierarchy**

All surfaces should follow this hierarchy:

```css
/* Primary surfaces (sidebar, topbar, modals) */
backdrop-filter: blur(20px) saturate(140%);
background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(248,252,250,0.92));

/* Secondary surfaces (cards, panels) */
backdrop-filter: blur(14px) saturate(125%);
background: rgba(255,255,255,0.90);

/* Tertiary surfaces (inputs, small components) */
backdrop-filter: blur(10px) saturate(120%);
background: rgba(255,255,255,0.84-0.86);
```

### 2. **Shadow System**

Light mode shadows are **subtle and refined**:

```css
.glass-element {
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.95),  /* Inset highlight */
    0 2px 6px rgba(0,0,0,0.04-0.06);       /* Soft outer shadow */
}
```

**Never use**: Dark shadows, strong contrasts, or heavy transparencies.

### 3. **Border Treatment**

All borders use **pure black with low opacity**:

```css
border: 1px solid rgba(0,0,0,0.08-0.12);
```

**Why**: Provides visual definition while maintaining glass aesthetic.

### 4. **Color Mixing**

Use this formula for optimal light mode colors:

```css
background: color-mix(in srgb, rgba(255,255,255,0.90) 90%, rgba(200,225,215,0.40));
```

This creates:
- Base white transparency
- Subtle green warmth
- Professional frosted appearance

---

## New Component Checklist

When adding a new component to light mode, follow this checklist:

### ✅ Required Updates

- [ ] **CSS Class Definition**
  ```css
  .new-component {
    /* Base dark mode styles */
  }
  body.light .new-component {
    background: rgba(255,255,255,0.90);
    border: 1px solid rgba(0,0,0,0.08);
    backdrop-filter: blur(14px) saturate(125%);
    -webkit-backdrop-filter: blur(14px) saturate(125%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 6px rgba(0,0,0,0.04);
  }
  ```

- [ ] **Contract Verification**: 4.5:1 minimum for text
- [ ] **Backdrop Filter**: Applied with webkit prefix
- [ ] **Inset Highlight**: Always included for depth
- [ ] **Shadow Testing**: Verify in light mode on white backgrounds

### ✅ Optional Enhancements

- [ ] **Hover State**: Light background lift effect
- [ ] **Focus State**: Refined outline with brand color
- [ ] **Animation**: Smooth transitions for state changes

---

## CSS Variable Reference

### Light Mode Variables

```css
body.light {
  /* Backgrounds */
  --bg-base:      #e8f0ed;
  --bg-surface:   rgba(255,255,255,0.92);
  --bg-card:      rgba(255,255,255,0.88);
  --bg-elevated:  rgba(248,252,250,0.94);
  --bg-hover:     rgba(225,238,232,0.88);
  
  /* Borders */
  --border:       rgba(0,0,0,0.07);
  --border-hi:    rgba(0,0,0,0.12);
  --border-brand: rgba(18,192,139,0.32);
  
  /* Text */
  --text-1:       #0d1b25;
  --text-2:       #1f2e3a;
  --text-3:       #556673;
  
  /* Glass Effects */
  --glass-blur:           blur(16px) saturate(135%);
  --glass-blur-soft:      blur(12px) saturate(120%);
  --card-glass-shadow:    0 4px 12px rgba(0,0,0,0.06), inset 0 0.5px 0 rgba(255,255,255,0.85);
}
```

---

## Common Patterns

### Pattern 1: Standard Card

```css
.my-card {
  background: var(--card-glass-bg);
  border: 1px solid var(--card-glass-border);
  border-radius: var(--radius);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--card-glass-shadow);
}

body.light .my-card {
  background: rgba(255,255,255,0.90);
  border-color: rgba(0,0,0,0.08);
  backdrop-filter: blur(14px) saturate(125%);
  -webkit-backdrop-filter: blur(14px) saturate(125%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 6px rgba(0,0,0,0.04);
}
```

### Pattern 2: Input Field

```css
.my-input {
  background: color-mix(in srgb, var(--card-glass-bg) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--card-glass-border) 88%, transparent);
  backdrop-filter: var(--glass-blur-soft);
  -webkit-backdrop-filter: var(--glass-blur-soft);
}

body.light .my-input {
  background: rgba(255,255,255,0.86);
  border-color: rgba(0,0,0,0.10);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}
```

### Pattern 3: Glass Button

```css
.my-button {
  background: color-mix(in srgb, var(--card-glass-bg) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--card-glass-border) 88%, transparent);
  backdrop-filter: var(--glass-blur-soft);
  -webkit-backdrop-filter: var(--glass-blur-soft);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}

body.light .my-button {
  background: rgba(255,255,255,0.84);
  border-color: rgba(0,0,0,0.10);
  backdrop-filter: blur(8px) saturate(115%);
  -webkit-backdrop-filter: blur(8px) saturate(115%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.94), 0 1px 2px rgba(0,0,0,0.03);
}
```

---

## Testing Guidelines

### Light Mode Testing Checklist

- [ ] **Visual**: Component appears with frosted glass effect
- [ ] **Contrast**: Text readable on glass surface (4.5:1+)
- [ ] **Interaction**: Hover/focus states work correctly
- [ ] **Responsive**: Glass effects scale on mobile
- [ ] **Browser**: Test on Chrome, Safari, Firefox
- [ ] **Performance**: DevTools shows no lag or jank

### Debug Tips

```javascript
// Check light mode is active
console.log(document.body.classList.contains('light'));

// Inspect computed styles
const el = document.querySelector('.my-element');
console.log(window.getComputedStyle(el).backdropFilter);
```

---

## Common Mistakes to Avoid

❌ **DON'T**
- Use hard-coded colors instead of CSS variables
- Apply different blur values across similar components
- Add strong shadows (they compete with glass effect)
- Forget webkit prefix for backdrop-filter
- Use high opacity for glass backgrounds (>0.95)
- Mix border styles (all should be subtle)

✅ **DO**
- Use CSS variables for consistency
- Maintain blur hierarchy: 20px > 14px > 10px
- Use soft, refined shadows (0.04-0.06 opacity)
- Always include webkit prefix
- Keep glass backgrounds at 0.84-0.94 opacity
- Use pure black borders at 0.07-0.12 opacity

---

## Performance Optimization

### HTML Structure Best Practice

```html
<!-- Good: Container with backdrop filter -->
<div class="my-glass-card">
  <div class="my-glass-card-content">
    <!-- Content here -->
  </div>
</div>
```

### CSS Optimization

```css
/* Good: GPU acceleration hint */
.glass-element {
  will-change: backdrop-filter;
  transform: translateZ(0);
}

/* After animation/interaction, reset */
.glass-element:not(:hover) {
  will-change: auto;
}
```

---

## Troubleshooting

### Issue: Glass effect not showing in light mode

**Solution**: Verify `body.light` class is active
```javascript
document.body.classList.add('light');
```

### Issue: Border looks wrong on light mode

**Solution**: Check border is using `rgba(0,0,0,X)` not color-mix
```css
border: 1px solid rgba(0,0,0,0.08); /* Good */
border: 1px solid #ccc; /* Bad */
```

### Issue: Text contrast too low

**Solution**: Increase text color depth
```css
color: #1f2e3a; /* Better contrast than #333 on glass */
```

### Issue: Glass effect blurred with content beneath

**Solution**: Reduce backdrop-filter blur value
```css
backdrop-filter: blur(10px) saturate(120%); /* Instead of 20px */
```

---

## Light Mode Roadmap

### Future Enhancements

1. **V2.0**: Micro-interactions on glass surfaces
2. **V2.1**: Custom glass opacity controls
3. **V2.2**: Advanced gradient blends
4. **V2.3**: Animated gradient backgrounds in light mode

---

## Resources

- **CSS Backdrop Filter**: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- **Color Mixing Function**: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix
- **WCAG Contrast Tool**: https://webaim.org/resources/contrastchecker/
- **Glass Morphism Specs**: https://www.apple.com/design/human-interface-guidelines/

---

## Support & Questions

For questions about light mode styling:

1. Check the **Color Mixing Pattern** section first
2. Review **CSS Variable Reference** for correct values
3. Consult **Common Patterns** for similar components
4. Run through **Testing Guidelines** to validate

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Maintainer**: MOS Admin UI Team
