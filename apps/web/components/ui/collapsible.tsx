'use client';

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

// Workaround for React 19 type compatibility with Radix UI
const Collapsible = CollapsiblePrimitive.Root as React.FC<
  CollapsiblePrimitive.CollapsibleProps & React.RefAttributes<HTMLDivElement>
>;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger as React.FC<
  CollapsiblePrimitive.CollapsibleTriggerProps & React.RefAttributes<HTMLButtonElement>
>;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent as React.FC<
  CollapsiblePrimitive.CollapsibleContentProps & React.RefAttributes<HTMLDivElement>
>;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
