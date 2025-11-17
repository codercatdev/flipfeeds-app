'use client';

import { ArrowRight, Users, Video, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="size-8 text-primary" />
            <h1 className="text-2xl font-bold">FlipFeeds</h1>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-10 w-20 bg-muted animate-pulse rounded" />
            ) : user ? (
              <Button asChild>
                <Link href="/feeds">Open Feeds</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signin">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Break Free from the Algorithm
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            FlipFeeds is video-first, intentional social media. No endless scrolling, no algorithmic
            feeds. Start with an empty feed and{' '}
            <span className="font-semibold text-foreground">flip</span> into the communities you
            actually care about.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button size="lg" asChild className="text-lg px-8">
                <Link href="/feeds">
                  Open Your Feeds
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="text-lg px-8">
                  <Link href="/signin">
                    Get Started Free
                    <ArrowRight className="ml-2 size-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <Link href="#features">Learn More</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why FlipFeeds?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border rounded-lg p-6">
              <div className="bg-primary/10 rounded-full size-12 flex items-center justify-center mb-4">
                <Zap className="size-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Intentional by Design</h4>
              <p className="text-muted-foreground">
                Start with an empty feed. Flip into communities and creators you choose. No surprise
                content, no manipulation.
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <div className="bg-primary/10 rounded-full size-12 flex items-center justify-center mb-4">
                <Video className="size-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Video-First Experience</h4>
              <p className="text-muted-foreground">
                Built for video from the ground up. Share moments, stories, and content in the most
                engaging format.
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <div className="bg-primary/10 rounded-full size-12 flex items-center justify-center mb-4">
                <Users className="size-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Your Communities</h4>
              <p className="text-muted-foreground">
                Join feeds that match your interests. From hobbies to professional networks, curate
                your perfect mix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-4xl font-bold mb-4">Ready to take control?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join FlipFeeds today and experience social media on your terms.
          </p>
          {user ? (
            <Button size="lg" asChild className="text-lg px-8">
              <Link href="/feeds">
                Go to Your Feeds
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
          ) : (
            <Button size="lg" asChild className="text-lg px-8">
              <Link href="/signin">
                Start for Free
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Video className="size-6 text-primary" />
              <span className="font-semibold">FlipFeeds</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 FlipFeeds. Intentional social media.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
