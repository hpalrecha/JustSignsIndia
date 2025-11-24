import { Card } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Building2, Package, Bike, Zap } from "lucide-react";
import facilityImage from "@assets/generated_images/professional_facility_interior.png";
import certificationImage from "@assets/generated_images/3m_partnership_certification.png";
import printingImage from "@assets/generated_images/printing_facility_equipment.png";

export default function About() {
  const features = [
    {
      icon: Building2,
      title: "Association with 3M",
      description: "Official Master Distributor for 3M automotive and architectural films across India, ensuring genuine products and quality assurance.",
    },
    {
      icon: Package,
      title: "In-House Infrastructure",
      description: "State-of-the-art printing, plotting, and lamination facilities for custom solutions and rapid turnaround times.",
    },
    {
      icon: Bike,
      title: "Bike Customization",
      description: "Specialized services for Royal Enfield and premium motorcycle styling with custom wraps, decals, and protection films.",
    },
    {
      icon: Zap,
      title: "E-Store Solutions",
      description: "Comprehensive online platform for easy product browsing, ordering, and nationwide delivery of 3M films and accessories.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${facilityImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif font-bold text-5xl md:text-6xl text-white mb-6" data-testid="text-about-hero-title">
            About Just Signs India
          </h1>
          <p className="text-xl text-white/90" data-testid="text-about-hero-subtitle">
            Your Trusted Partner for Premium 3M Solutions
          </p>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif font-bold text-4xl mb-6" data-testid="text-company-title">
                Who We Are
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p data-testid="text-company-description-1">
                  Just Signs India Pvt. Ltd. is the premier Master Distributor of 3M automotive and architectural films in India. With over a decade of excellence, we've established ourselves as the go-to source for premium protection and styling solutions.
                </p>
                <p data-testid="text-company-description-2">
                  Operating across 82+ cities with 1200+ successfully delivered projects, we maintain an impressive 95% customer retention rate. Our commitment to quality, authenticity, and customer satisfaction sets us apart in the industry.
                </p>
                <p data-testid="text-company-description-3">
                  We specialize in both automotive and architectural applications, offering comprehensive solutions from vehicle wraps and paint protection films to window films and commercial signage. Our expertise extends to custom bike styling, particularly for Royal Enfield enthusiasts.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src={certificationImage}
                alt="3M Partnership"
                className="rounded-lg shadow-lg w-full"
                data-testid="image-certification"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-bold text-4xl text-center mb-12" data-testid="text-features-title">
            What Sets Us Apart
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover-elevate" data-testid={`card-feature-${index}`}>
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="font-serif font-bold text-xl mb-3" data-testid={`text-feature-title-${index}`}>
                  {feature.title}
                </h3>
                <p className="text-muted-foreground" data-testid={`text-feature-description-${index}`}>
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-bold text-4xl text-center mb-12" data-testid="text-products-overview-title">
            Our Product Expertise
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="p-8">
              <h3 className="font-serif font-bold text-2xl mb-4 text-primary" data-testid="text-wrap-films-title">
                3M™ 2080 Wrap Films
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-wrap-films-description">
                The industry-leading vinyl wrap films featuring dual-cast technology for exceptional conformability and durability. Available in over 100 colors and finishes including gloss, matte, satin, and specialty textures. Perfect for complete vehicle transformations with 7-year warranty coverage.
              </p>
            </Card>

            <Card className="p-8">
              <h3 className="font-serif font-bold text-2xl mb-4 text-primary" data-testid="text-printable-wraps-title">
                Printable Wrap Films
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-printable-wraps-description">
                High-quality printable vinyl films ideal for custom graphics, branding, and unique designs. Our in-house printing and lamination facility ensures vibrant colors, sharp details, and professional finishing for commercial fleet graphics and personal customizations.
              </p>
            </Card>

            <Card className="p-8">
              <h3 className="font-serif font-bold text-2xl mb-4 text-primary" data-testid="text-ppf-title">
                Paint Protection Films (PPF)
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-ppf-description">
                Premium clear protective films that shield your vehicle's paint from rock chips, scratches, and environmental damage. Self-healing technology ensures minor scratches disappear with heat application. Backed by 10-year warranty for peace of mind.
              </p>
            </Card>

            <Card className="p-8">
              <h3 className="font-serif font-bold text-2xl mb-4 text-primary" data-testid="text-bike-styling-title">
                Bike Styling & Decals
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-bike-styling-description">
                Specialized customization services for motorcycles, especially Royal Enfield models. From full wraps to custom decals, tank graphics, and protection solutions. Our expertise in bike styling helps riders express their personality while protecting their investment.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img
                src={printingImage}
                alt="Printing Facility"
                className="rounded-lg shadow-lg w-full"
                data-testid="image-facility"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-serif font-bold text-4xl mb-6" data-testid="text-infrastructure-title">
                State-of-the-Art Infrastructure
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p data-testid="text-infrastructure-description-1">
                  Our modern facility is equipped with cutting-edge printing, plotting, and lamination technology, enabling us to deliver custom solutions with exceptional quality and precision.
                </p>
                <p data-testid="text-infrastructure-description-2">
                  From small-scale custom decals to large format commercial graphics, our in-house capabilities ensure quick turnaround times without compromising on quality. We maintain strict quality control standards at every stage of production.
                </p>
                <p data-testid="text-infrastructure-description-3">
                  Our dedicated team of experienced technicians and installers undergo regular training on the latest 3M products and application techniques, ensuring flawless results every time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
