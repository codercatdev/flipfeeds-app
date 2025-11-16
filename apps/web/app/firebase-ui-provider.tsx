'use client';

import { initializeUI } from '@firebase-ui/core';
import { ConfigProvider } from '@firebase-ui/react';
import { app } from '@/lib/firebase';

const ui = initializeUI({
    app,
});

export function FirebaseUIProvider({ children }: { children: React.ReactNode }) {
    return (
        <ConfigProvider
            ui={ui}
            policies={{
                termsOfServiceUrl: '<my-tos-url>',
                privacyPolicyUrl: '<my-privacy-policy-url>',
            }}
        >
            {children}
        </ConfigProvider>
    );
}
