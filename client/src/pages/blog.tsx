import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, ArrowRight } from "lucide-react";
import type { BlogPost } from "@shared/schema";

export default function Blog() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  const formatDate = (dateString: Date | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif font-bold text-5xl md:text-6xl mb-6" data-testid="text-blog-hero-title">
            Our Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-blog-hero-subtitle">
            Stay updated with the latest news, tips, and insights about automotive and architectural films
          </p>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-muted"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Card key={post.id} className="overflow-hidden hover-elevate group" data-testid={`card-blog-${post.id}`}>
                  {post.featuredImageUrl && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.featuredImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="w-4 h-4" />
                      <span data-testid={`text-blog-date-${post.id}`}>{formatDate(post.createdAt)}</span>
                    </div>
                    <h2 className="font-serif font-bold text-xl mb-3 line-clamp-2" data-testid={`text-blog-title-${post.id}`}>
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground mb-4 line-clamp-3" data-testid={`text-blog-excerpt-${post.id}`}>
                      {post.excerpt}
                    </p>
                    <Link href={`/blog/${post.slug}`}>
                      <Button variant="ghost" className="group/btn p-0 h-auto font-medium" data-testid={`button-read-more-${post.id}`}>
                        Read More
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <h2 className="font-serif text-2xl mb-4">No blog posts yet</h2>
              <p className="text-muted-foreground">Check back soon for updates and insights!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
