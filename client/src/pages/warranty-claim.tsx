import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertWarrantyClaimSchema } from "@shared/schema";
import type { InsertWarrantyClaim } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function WarrantyClaim() {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<InsertWarrantyClaim>({
    resolver: zodResolver(insertWarrantyClaimSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      city: "",
      productType: "",
      installationCenter: "",
      installationDate: "",
      issueDescription: "",
      imageUrls: [],
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 5) {
        toast({
          title: "Too Many Files",
          description: "You can upload a maximum of 5 images.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    const urls: string[] = [];

    try {
      for (const file of selectedFiles) {
        // Get signed upload URL and normalized object path from backend
        const response: any = await apiRequest("POST", "/api/upload-url", {});
        
        console.log("Full response from /api/upload-url:", JSON.stringify(response));
        console.log("response.uploadURL type:", typeof response?.uploadURL);
        console.log("response.objectPath type:", typeof response?.objectPath);
        
        const uploadURL = response?.uploadURL;
        const objectPath = response?.objectPath;
        
        console.log("uploadURL:", uploadURL);
        console.log("objectPath:", objectPath);
        
        if (!uploadURL || typeof uploadURL !== 'string' || !objectPath || typeof objectPath !== 'string') {
          console.error("Invalid response from /api/upload-url:", response);
          console.error("Validation failed - uploadURL:", uploadURL, "objectPath:", objectPath);
          throw new Error(`Invalid upload URL received from server. uploadURL: ${typeof uploadURL}, objectPath: ${typeof objectPath}`);
        }
        
        // Upload file to signed URL
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        // Store the normalized object path (not the temporary signed URL)
        urls.push(objectPath);
      }

      setUploadedUrls(urls);
      return urls;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload images. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: InsertWarrantyClaim) => {
      const imageUrls = await uploadFiles();
      return await apiRequest("POST", "/api/warranty-claims", {
        ...data,
        imageUrls,
      });
    },
    onSuccess: () => {
      toast({
        title: "Warranty Claim Submitted",
        description: "We'll review your claim and get back to you within 24-48 hours.",
      });
      form.reset();
      setSelectedFiles([]);
      setUploadedUrls([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertWarrantyClaim) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Images",
        description: "Please upload at least one image of the issue.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="font-serif font-bold text-5xl md:text-6xl mb-6" data-testid="text-warranty-hero-title">
            Warranty Claim
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-warranty-hero-subtitle">
            Submit your warranty claim for 3M products. We're committed to standing behind our products.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 md:p-12">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Customer Details */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-customer-details-title">
                    Customer Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} data-testid="input-customer-name" />
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
                          <FormLabel>Email Address *</FormLabel>
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
                  </div>
                </div>

                {/* Product Information */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-product-info-title">
                    Product Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="productType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-product-type">
                                <SelectValue placeholder="Select product type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Wrap Film">Wrap Film</SelectItem>
                              <SelectItem value="PPF">Paint Protection Film (PPF)</SelectItem>
                              <SelectItem value="Window Film">Window Film</SelectItem>
                              <SelectItem value="Bike Wrap">Bike Wrap/Decal</SelectItem>
                              <SelectItem value="Signage">Signage</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="installationCenter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Installation Center Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Where was it installed?" {...field} data-testid="input-installation-center" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="installationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Installation *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-installation-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Issue Description */}
                <FormField
                  control={form.control}
                  name="issueDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the issue in detail..."
                          className="min-h-32"
                          {...field}
                          data-testid="textarea-issue-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <div>
                  <Label>Upload Images *</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please upload clear photos of the issue (up to 5 images)
                  </p>
                  
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary font-medium">Click to upload</span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        data-testid="input-file-upload"
                      />
                    </label>
                    <p className="text-sm text-muted-foreground mt-2">
                      PNG, JPG, JPEG up to 10MB each
                    </p>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          data-testid={`file-item-${index}`}
                        >
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            data-testid={`button-remove-file-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitMutation.isPending || isUploading || selectedFiles.length === 0}
                    data-testid="button-submit-claim"
                  >
                    {isUploading ? "Uploading..." : submitMutation.isPending ? "Submitting..." : "Submit Warranty Claim"}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground mt-4">
                    We'll review your claim and respond within 24-48 hours
                  </p>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </section>
    </div>
  );
}
