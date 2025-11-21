import { Mail } from 'lucide-react';

export default function InboxPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Mail className="size-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">Inbox</h1>
      <p className="text-muted-foreground">Messages and notifications will appear here.</p>
    </div>
  );
}
