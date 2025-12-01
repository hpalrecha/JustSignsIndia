import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertContactSubmissionSchema } from "@shared/schema";
import type { InsertContactSubmission } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Contact() {
  const { toast } = useToast();

  const form = useForm<InsertContactSubmission>({
    resolver: zodResolver(insertContactSubmissionSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      city: "",
      message: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertContactSubmission) => {
      return await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent Successfully",
        description: "We'll get back to you within 24 hours.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContactSubmission) => {
    submitMutation.mutate(data);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Phone",
      details: ["080 4336 5954"],
    },
    {
      icon: Mail,
      title: "Email",
      details: ["hp@justsigns.co.in", "sales@justsigns.co.in"],
    },
    {
      icon: MapPin,
      title: "Address",
      details: ["75, 1st Floor, Vanivilas Rd,", "Gandhi Bazaar, Basavanagudi,", "Bengaluru, Karnataka 560004"],
    },
    {
      icon: MapPin,
      title: "Coverage",
      details: ["82+ Cities Across India"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif font-bold text-5xl md:text-6xl mb-6" data-testid="text-contact-hero-title">
            Contact Us
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-contact-hero-subtitle">
            Get in touch with our team for expert advice and premium 3M solutions
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((item, index) => (
              <Card key={index} className="p-6 text-center hover-elevate" data-testid={`card-contact-info-${index}`}>
                <item.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-3" data-testid={`text-contact-title-${index}`}>
                  {item.title}
                </h3>
                <div className="space-y-1">
                  {item.details.map((detail, detailIndex) => (
                    <p key={detailIndex} className="text-muted-foreground" data-testid={`text-contact-detail-${index}-${detailIndex}`}>
                      {detail}
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <Card className="p-8">
              <h2 className="font-serif font-bold text-3xl mb-6" data-testid="text-form-title">
                Send us a Message
              </h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 9999999999" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your city" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your requirements..."
                            className="min-h-32"
                            {...field}
                            data-testid="textarea-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-contact"
                  >
                    {submitMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            </Card>

            {/* Additional Info */}
            <div className="space-y-8">
              <div>
                <h2 className="font-serif font-bold text-3xl mb-6" data-testid="text-info-title">
                  Why Choose Us?
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-semibold mb-1">Authorized Master Distributor</h3>
                      <p className="text-muted-foreground">
                        Official 3M partner ensuring 100% genuine products and full warranty coverage
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-semibold mb-1">Expert Installation Network</h3>
                      <p className="text-muted-foreground">
                        Certified installers across 82+ cities with professional training
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-semibold mb-1">In-House Capabilities</h3>
                      <p className="text-muted-foreground">
                        Complete printing, plotting, and lamination facility for custom solutions
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-semibold mb-1">Proven Track Record</h3>
                      <p className="text-muted-foreground">
                        1200+ successful projects with 95% customer retention rate
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="p-6 bg-primary text-primary-foreground">
                <h3 className="font-serif font-bold text-2xl mb-4">Quick Response</h3>
                <p className="mb-4">
                  We understand your time is valuable. Our team responds to all inquiries within 24 hours.
                </p>
                <p className="text-sm opacity-90">
                  For urgent requests, please call our business enquiry line directly.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
