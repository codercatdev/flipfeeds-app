'use client';

import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

// Workaround for React 19 type compatibility with Radix UI
const AspectRatio = AspectRatioPrimitive.Root as React.FC<
  AspectRatioPrimitive.AspectRatioProps & React.RefAttributes<HTMLDivElement>
>;

export { AspectRatio };
