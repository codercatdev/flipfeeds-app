import { Button } from '@/components/ui/button';

export default function Home() {
    return (
        <div className="flex min-h-screen items-center justify-center p-8">
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold">FlipFeeds - shadcn/ui Demo</h1>
                    <p className="text-lg text-muted-foreground">
                        Demonstrating shared UI components from{' '}
                        <code className="bg-muted px-2 py-1 rounded">@flip-feeds/ui</code> package
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Button Variants</h2>
                        <div className="flex gap-4 flex-wrap">
                            <Button>Default</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="link">Link</Button>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Button Sizes</h2>
                        <div className="flex gap-4 items-center flex-wrap">
                            <Button size="sm">Small</Button>
                            <Button size="default">Default</Button>
                            <Button size="lg">Large</Button>
                            <Button size="icon">⭐</Button>
                        </div>
                    </div>

                    <div className="p-6 border rounded-lg bg-muted/50">
                        <h3 className="font-semibold mb-2">✅ Setup Complete!</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li>
                                Created <code>packages/ui</code> with shadcn/ui configuration
                            </li>
                            <li>Installed Button component from shadcn/ui registry</li>
                            <li>Components are shared across monorepo workspaces</li>
                            <li>
                                Ready to add more components with:{' '}
                                <code>pnpm dlx shadcn@latest add [component]</code>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
