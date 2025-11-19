// Type overrides for Radix UI React 19 compatibility
// This file provides type fixes for Radix UI components until official React 19 support is released

import 'react';

declare module 'react' {
  // Add children property to ReactPortal to fix React 19 type compatibility
  interface ReactPortal {
    children?: ReactNode;
  }
}
