import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { Palette, Shield, Car, Sun, FileText, Sparkles } from "lucide-react";

export default function Products() {
  const categories = [
    {
      icon: Palette,
      title: "3M™ 2080 Wrap Films",
      description: "Premium vinyl wrap films with dual-cast technology in 100+ colors and finishes",
      products: [
        { name: "Gloss Series", specs: "Mirror-like finish, 7-year warranty" },
        { name: "Matte Series", specs: "Non-reflective elegant finish" },
        { name: "Satin Series", specs: "Perfect balance of gloss and matte" },
        { name: "Brushed Metal", specs: "Metallic texture appearance" },
        { name: "Carbon Fiber", specs: "3D textured carbon look" },
        { name: "Color Flip", specs: "Multi-chromatic color shift" },
      ],
    },
    {
      icon: FileText,
      title: "Printed Wraps",
      description: "High-quality printable vinyl for custom graphics and fleet branding",
      products: [
        { name: "Gloss Printable", specs: "Vibrant color reproduction" },
        { name: "Matte Printable", specs: "Professional non-glare finish" },
        { name: "Cast Printable", specs: "Complex curve conformability" },
        { name: "Calendered Film", specs: "Economical short-term graphics" },
        { name: "Reflective Media", specs: "High-visibility applications" },
        { name: "Clear Laminate", specs: "UV protection overlay" },
      ],
    },
    {
      icon: Car,
      title: "Car Styling & Decals",
      description: "Custom car wraps and graphics for complete vehicle transformation",
      products: [
        { name: "Full Car Wraps", specs: "Complete vehicle transformation" },
        { name: "Hood Graphics", specs: "Custom hood design solutions" },
        { name: "Racing Stripes", specs: "Performance-inspired styling" },
        { name: "Body Decals", specs: "Side and rear graphics" },
        { name: "Chrome Delete", specs: "Blackout trim customization" },
        { name: "Custom Logos", specs: "Personalized branding" },
      ],
    },
    {
      icon: Shield,
      title: "Paint Protection Films (PPF)",
      description: "Crystal-clear films with self-healing technology to protect vehicle paint",
      products: [
        { name: "Full Front Coverage", specs: "Hood, bumper, fenders, mirrors" },
        { name: "Partial Coverage", specs: "High-impact areas protection" },
        { name: "Full Body PPF", specs: "Complete vehicle protection" },
        { name: "Headlight Film", specs: "Lens protection and clarity" },
        { name: "Door Edge Guards", specs: "Chip and scratch prevention" },
        { name: "Rocker Panels", specs: "Lower body protection" },
      ],
    },
    {
      icon: Sun,
      title: "Window Films",
      description: "Solar control and privacy films for automotive and architectural applications",
      products: [
        { name: "Automotive Tint", specs: "UV rejection, heat reduction" },
        { name: "Ceramic Film", specs: "Premium IR heat blocking" },
        { name: "Security Film", specs: "Shatter resistance protection" },
        { name: "Privacy Film", specs: "One-way visibility solutions" },
        { name: "Commercial Tint", specs: "Building energy efficiency" },
        { name: "Decorative Film", specs: "Frosted and patterned options" },
      ],
    },
    {
      icon: Sparkles,
      title: "Signage Solutions",
      description: "Commercial graphics, fleet branding, and architectural signage",
      products: [
        { name: "Vehicle Graphics", specs: "Fleet branding and wraps" },
        { name: "Building Signage", specs: "Exterior architectural graphics" },
        { name: "Window Graphics", specs: "Storefront and display" },
        { name: "Wall Murals", specs: "Interior decoration solutions" },
        { name: "Safety Markings", specs: "Industrial and commercial" },
        { name: "Promotional Decals", specs: "Event and marketing graphics" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif font-bold text-5xl md:text-6xl mb-6" data-testid="text-products-hero-title">
            Our Products
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-products-hero-subtitle">
            Comprehensive range of premium 3M films and solutions for automotive and architectural applications
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {categories.map((category, categoryIndex) => (
              <div key={categoryIndex} data-testid={`category-${categoryIndex}`}>
                <Card className="p-8 md:p-12">
                  <div className="flex items-start gap-6 mb-8">
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <category.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-serif font-bold text-3xl mb-3" data-testid={`text-category-title-${categoryIndex}`}>
                        {category.title}
                      </h2>
                      <p className="text-lg text-muted-foreground" data-testid={`text-category-description-${categoryIndex}`}>
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.products.map((product, productIndex) => (
                      <div
                        key={productIndex}
                        className="p-6 rounded-lg border hover-elevate"
                        data-testid={`product-${categoryIndex}-${productIndex}`}
                      >
                        <h3 className="font-semibold text-lg mb-2" data-testid={`text-product-name-${categoryIndex}-${productIndex}`}>
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-product-specs-${categoryIndex}-${productIndex}`}>
                          {product.specs}
                        </p>
                        <Link href="/contact">
                          <Button variant="outline" size="sm" className="w-full" data-testid={`button-quote-${categoryIndex}-${productIndex}`}>
                            Get Quote
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif font-bold text-4xl mb-6" data-testid="text-cta-title">
            Need Help Choosing?
          </h2>
          <p className="text-xl text-muted-foreground mb-8" data-testid="text-cta-subtitle">
            Our experts are here to help you find the perfect solution for your needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" data-testid="button-contact">
                Contact Our Team
              </Button>
            </Link>
            <Link href="/warranty-claim">
              <Button size="lg" variant="outline" data-testid="button-warranty">
                Warranty Support
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
