import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Image, File } from "lucide-react";
import type { MarketingCollateral } from "@shared/schema";

export default function Downloads() {
  const { data: items, isLoading } = useQuery<MarketingCollateral[]>({
    queryKey: ["/api/marketing-collateral"],
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image")) return Image;
    if (fileType.includes("pdf")) return FileText;
    return File;
  };

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.includes("pdf")) return "PDF";
    if (fileType.includes("image")) return "Image";
    if (fileType.includes("doc")) return "Document";
    return "File";
  };

  const groupedItems = items?.reduce((acc, item) => {
    const category = item.category || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MarketingCollateral[]>);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif font-bold text-5xl md:text-6xl mb-6" data-testid="text-downloads-hero-title">
            Marketing Collateral
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-downloads-hero-subtitle">
            Download brochures, catalogs, and marketing materials for our premium 3M products
          </p>
        </div>
      </section>

      {/* Downloads Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : groupedItems && Object.keys(groupedItems).length > 0 ? (
            <div className="space-y-12">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category}>
                  <h2 className="font-serif font-bold text-2xl mb-6" data-testid={`text-category-${category.toLowerCase().replace(/\s+/g, "-")}`}>
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryItems.map((item) => {
                      const FileIcon = getFileIcon(item.fileType);
                      return (
                        <Card key={item.id} className="p-6 hover-elevate" data-testid={`card-download-${item.id}`}>
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                              <FileIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1 truncate" data-testid={`text-download-title-${item.id}`}>
                                {item.title}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-download-description-${item.id}`}>
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  {getFileTypeLabel(item.fileType)}
                                </span>
                                <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                  <Button size="sm" variant="outline" data-testid={`button-download-${item.id}`}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-serif text-2xl mb-4">No downloads available yet</h2>
              <p className="text-muted-foreground">Check back soon for marketing materials and brochures!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif font-bold text-4xl mb-6" data-testid="text-cta-title">
            Need Custom Materials?
          </h2>
          <p className="text-xl text-muted-foreground mb-8" data-testid="text-cta-subtitle">
            Contact us for customized marketing collateral or specific product information
          </p>
          <Button size="lg" asChild data-testid="button-contact">
            <a href="/contact">Contact Our Team</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
