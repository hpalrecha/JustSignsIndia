import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { Building2, TrendingUp, Users, Award } from "lucide-react";
import heroImage from "@assets/generated_images/hero_car_wrap_application.png";
import wrapImage from "@assets/generated_images/3m_wrap_films_display.png";
import ppfImage from "@assets/generated_images/ppf_installation_process.png";
import bikeImage from "@assets/generated_images/bike_styling_customization.png";
import windowImage from "@assets/generated_images/window_film_architecture.png";
import signageImage from "@assets/generated_images/printing_facility_equipment.png";

export default function Home() {
  const stats = [
    { icon: Building2, value: "82+", label: "Cities Covered", color: "text-primary" },
    { icon: TrendingUp, value: "1200+", label: "Projects Delivered", color: "text-primary" },
    { icon: Users, value: "95%", label: "Returning Customers", color: "text-primary" },
    { icon: Award, value: "10+", label: "Years in Industry", color: "text-primary" },
  ];

  const products = [
    { title: "3M Wrap Films", image: wrapImage, path: "/products" },
    { title: "Paint Protection Films", image: ppfImage, path: "/products" },
    { title: "Car Styling & Decals", image: bikeImage, path: "/products" },
    { title: "Window Films", image: windowImage, path: "/products" },
    { title: "Signage Solutions", image: signageImage, path: "/products" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif font-bold text-5xl md:text-7xl text-white mb-6" data-testid="text-hero-title">
            One-Stop Solution for Automotive & Architectural Protection Films
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto" data-testid="text-hero-subtitle">
            Master Distributor of 3M Wrap Films, PPF, Window Films & Signage Solutions across India
          </p>
          <Link href="/products">
            <Button size="lg" className="text-lg px-8 py-6" data-testid="button-explore-products">
              Explore Our Products
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="p-8 text-center hover-elevate" data-testid={`card-stat-${index}`}>
                <stat.icon className={`w-12 h-12 mx-auto mb-4 ${stat.color}`} />
                <div className="font-serif font-bold text-5xl text-primary mb-2" data-testid={`text-stat-value-${index}`}>
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium" data-testid={`text-stat-label-${index}`}>
                  {stat.label}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Carousel Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-bold text-4xl md:text-5xl text-center mb-12" data-testid="text-products-title">
            Our Product Range
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <Link key={index} href={product.path}>
                <Card className="overflow-hidden hover-elevate cursor-pointer group" data-testid={`card-product-${index}`}>
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
                      <h3 className="font-serif font-bold text-2xl text-white p-6" data-testid={`text-product-title-${index}`}>
                        {product.title}
                      </h3>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/products">
              <Button size="lg" variant="outline" data-testid="button-view-all-products">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif font-bold text-4xl md:text-5xl mb-6" data-testid="text-cta-title">
            Ready to Transform Your Vehicle or Space?
          </h2>
          <p className="text-xl mb-8 opacity-90" data-testid="text-cta-subtitle">
            Get in touch with us for expert consultation and premium 3M solutions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary" data-testid="button-contact-us">
                Contact Us
              </Button>
            </Link>
            <Link href="/warranty-claim">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10" data-testid="button-warranty-claim">
                Start Warranty Claim
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-serif font-bold text-xl mb-4">Just Signs India</h3>
              <p className="text-muted-foreground">
                Master Distributor of 3M Films across India
              </p>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/about" className="block text-muted-foreground hover:text-primary">About Us</Link>
                <Link href="/products" className="block text-muted-foreground hover:text-primary">Products</Link>
                <Link href="/contact" className="block text-muted-foreground hover:text-primary">Contact</Link>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-lg mb-4">Contact</h3>
              <p className="text-muted-foreground">
                Phone: 080 4336 5954<br />
                Email: hp@justsigns.co.in<br />
                75, 1st Floor, Vanivilas Rd,<br />
                Gandhi Bazaar, Basavanagudi,<br />
                Bengaluru, Karnataka 560004
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-muted-foreground">
            © 2024 Just Signs India Pvt. Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
