import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Calendar, ArrowLeft } from "lucide-react";
import type { BlogPost } from "@shared/schema";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  
  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog", params.slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/${params.slug}`);
      if (!response.ok) {
        throw new Error("Post not found");
      }
      return response.json();
    },
  });

  const formatDate = (dateString: Date | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-12 bg-muted rounded w-3/4"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-4xl mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <article className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link href="/blog">
            <Button variant="ghost" className="mb-8" data-testid="button-back-to-blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          {/* Post Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-post-date">{formatDate(post.createdAt)}</span>
            </div>
            <h1 className="font-serif font-bold text-4xl md:text-5xl mb-6" data-testid="text-post-title">
              {post.title}
            </h1>
            <p className="text-xl text-muted-foreground" data-testid="text-post-excerpt">
              {post.excerpt}
            </p>
          </header>

          {/* Featured Image */}
          {post.featuredImageUrl && (
            <div className="mb-12 rounded-lg overflow-hidden">
              <img
                src={post.featuredImageUrl}
                alt={post.title}
                className="w-full h-auto"
                data-testid="image-post-featured"
              />
            </div>
          )}

          {/* Post Content */}
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            data-testid="text-post-content"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />

          {/* CTA Section */}
          <Card className="mt-12 p-8 bg-primary/5 border-primary/20">
            <h3 className="font-serif font-bold text-2xl mb-4">Interested in Our Products?</h3>
            <p className="text-muted-foreground mb-6">
              Contact our team for expert consultation on automotive and architectural film solutions.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/contact">
                <Button data-testid="button-contact-cta">Contact Us</Button>
              </Link>
              <Link href="/products">
                <Button variant="outline" data-testid="button-products-cta">View Products</Button>
              </Link>
            </div>
          </Card>
        </div>
      </article>
    </div>
  );
}
