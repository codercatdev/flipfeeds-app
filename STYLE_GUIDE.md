# FlipFeeds Style Guide

## NativeWind Version
**ALWAYS USE: NativeWind v5**

## Color Palette

### Strict Color Rules
**ONLY USE THESE COLORS:**
- **Primary**: `#F97316` (Orange)
- **Black**: For dark mode backgrounds and light mode text
- **White**: For light mode backgrounds and dark mode text

### Forbidden
- ❌ NO gray colors (gray-100, gray-200, etc.)
- ❌ NO additional colors (blue, green, red, yellow, etc.)
- ❌ NO custom hex colors except primary

## Theme Configuration

### Tailwind Config (tailwind.config.js)
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#F97316',
      },
    },
  },
};
```

## Component Styling Rules

### Backgrounds
- Light mode: `bg-white`
- Dark mode: `bg-black`
- Combined: `bg-white dark:bg-black`

### Text Colors
- Primary text: `text-black dark:text-white`
- Interactive/Links: `text-primary`
- Disabled/Muted: Use opacity instead of gray
  - Example: `text-black/50 dark:text-white/50`

### Buttons
- Primary button: `bg-primary`
- Secondary button: `bg-white dark:bg-black border border-black dark:border-white`
- Disabled: Use opacity `opacity-50`

### Input Fields
- Background: `bg-white dark:bg-black`
- Border: `border border-black/20 dark:border-white/20`
- Text: `text-black dark:text-white`
- Placeholder: `placeholderTextColor` with opacity

### Borders & Dividers
- Use black/white with opacity: `border-black/10 dark:border-white/10`

### Status Indicators
Instead of colored badges (green/red/yellow), use:
- **Success**: Primary color `bg-primary/10` with `text-primary`
- **Error**: Black/white inverted `bg-black dark:bg-white` with `text-white dark:text-black`
- **Warning**: Primary with lower opacity `bg-primary/20` with `text-primary`

## Component Examples

### Button (Primary)
```tsx
<TouchableOpacity className="bg-primary px-6 py-4 rounded-lg">
  <Text className="text-white font-semibold text-center">
    Button Text
  </Text>
</TouchableOpacity>
```

### Button (Secondary)
```tsx
<TouchableOpacity className="bg-white dark:bg-black border border-black dark:border-white px-6 py-4 rounded-lg">
  <Text className="text-black dark:text-white font-semibold text-center">
    Button Text
  </Text>
</TouchableOpacity>
```

### Text Input
```tsx
<TextInput
  className="bg-white dark:bg-black border border-black/20 dark:border-white/20 px-4 py-3 rounded-lg text-black dark:text-white"
  placeholder="Enter text"
  placeholderTextColor="rgba(0,0,0,0.4)"
/>
```

### Card/Container
```tsx
<View className="bg-white dark:bg-black border border-black/10 dark:border-white/10 p-4 rounded-lg">
  <Text className="text-black dark:text-white">Content</Text>
</View>
```

### Success Message
```tsx
<View className="bg-primary/10 border border-primary p-3 rounded-lg">
  <Text className="text-primary text-center font-semibold">
    ✓ Success message
  </Text>
</View>
```

### Error Message
```tsx
<View className="bg-black dark:bg-white border border-black dark:border-white p-3 rounded-lg">
  <Text className="text-white dark:text-black text-center font-semibold">
    ✗ Error message
  </Text>
</View>
```

### Screen Container
```tsx
<SafeAreaView className="flex-1 bg-white dark:bg-black">
  {/* Screen content */}
</SafeAreaView>
```

### Loading Indicator
```tsx
<View className="flex-1 justify-center items-center bg-white dark:bg-black">
  <ActivityIndicator size="large" color="#F97316" />
</View>
```

## Typography

### Headings
- H1: `text-4xl font-bold text-black dark:text-white`
- H2: `text-3xl font-bold text-black dark:text-white`
- H3: `text-2xl font-bold text-black dark:text-white`

### Body Text
- Regular: `text-base text-black dark:text-white`
- Small: `text-sm text-black dark:text-white`
- Tiny: `text-xs text-black dark:text-white`

### Links/Interactive Text
- Always use: `text-primary`

### Muted/Secondary Text
- Use opacity: `text-black/60 dark:text-white/60`

## Do's and Don'ts

### ✅ DO
- Use `bg-white dark:bg-black` for all backgrounds
- Use `text-black dark:text-white` for all primary text
- Use `text-primary` for interactive elements
- Use opacity for muted/disabled states
- Use `border-black/10 dark:border-white/10` for subtle borders

### ❌ DON'T
- Don't use gray colors (gray-100, gray-200, etc.)
- Don't use additional colors (blue, green, red, yellow)
- Don't hardcode hex colors except #F97316
- Don't use `style={{backgroundColor: '#ffffff'}}`
- Don't use inline color styles - use className

## Modal Overlays
```tsx
<View className="flex-1 justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
  <View className="bg-white dark:bg-black rounded-2xl p-6 border border-black/20 dark:border-white/20">
    {/* Modal content */}
  </View>
</View>
```

## Accessibility
- Ensure sufficient contrast between text and backgrounds
- Use opacity wisely - minimum 0.6 for readable text
- Primary color (#F97316) has good contrast on both black and white

## Migration Checklist
When updating existing screens:
1. [ ] Replace all `bg-gray-*` with `bg-white dark:bg-black`
2. [ ] Replace all `text-gray-*` with `text-black dark:text-white` or opacity variants
3. [ ] Replace colored badges with primary or inverted black/white
4. [ ] Update borders to use black/white with opacity
5. [ ] Ensure all buttons use primary or secondary style
6. [ ] Remove any hardcoded hex colors except #F97316
7. [ ] Test in both light and dark modes
