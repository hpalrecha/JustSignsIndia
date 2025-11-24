import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, X, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertWarrantyClaimSchema } from "@shared/schema";
import type { InsertWarrantyClaim } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function WarrantyClaim() {
  const { toast } = useToast();
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [justSignsInvoiceFile, setJustSignsInvoiceFile] = useState<File | null>(null);
  const [evidence1File, setEvidence1File] = useState<File | null>(null);
  const [evidence2File, setEvidence2File] = useState<File | null>(null);
  const [evidence3File, setEvidence3File] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<InsertWarrantyClaim>({
    resolver: zodResolver(insertWarrantyClaimSchema),
    defaultValues: {
      endUserName: "",
      endUserEmail: "",
      endUserMobile: "",
      installationDate: "",
      studioName: "",
      studioEmail: "",
      studioContactNo: "",
      invoiceNumber: "",
      invoiceUrl: "",
      justSignsInvoiceNumber: "",
      justSignsInvoiceUrl: "",
      productInstalled: "",
      lotNumber: "",
      issue: "",
      evidence1Url: "",
      evidence2Url: "",
      evidence3Url: "",
      claimSqft: "",
    },
  });

  const uploadFile = async (file: File): Promise<string> => {
    const response = await apiRequest("POST", "/api/upload-url", {});
    const data = await response.json();
    const uploadURL = data?.uploadURL;
    const objectPath = data?.objectPath;
    
    if (!uploadURL || typeof uploadURL !== 'string' || !objectPath || typeof objectPath !== 'string') {
      throw new Error("Invalid upload URL received from server");
    }
    
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

    return objectPath;
  };

  const uploadAllFiles = async () => {
    setIsUploading(true);
    try {
      const urls: any = {};

      if (invoiceFile) {
        urls.invoiceUrl = await uploadFile(invoiceFile);
      }
      if (justSignsInvoiceFile) {
        urls.justSignsInvoiceUrl = await uploadFile(justSignsInvoiceFile);
      }
      if (evidence1File) {
        urls.evidence1Url = await uploadFile(evidence1File);
      }
      if (evidence2File) {
        urls.evidence2Url = await uploadFile(evidence2File);
      }
      if (evidence3File) {
        urls.evidence3Url = await uploadFile(evidence3File);
      }

      return urls;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: InsertWarrantyClaim) => {
      const uploadedUrls = await uploadAllFiles();
      return await apiRequest("POST", "/api/warranty-claims", {
        ...data,
        ...uploadedUrls,
      });
    },
    onSuccess: () => {
      toast({
        title: "Warranty Claim Submitted",
        description: "We'll review your claim and get back to you within 24-48 hours.",
      });
      form.reset();
      setInvoiceFile(null);
      setJustSignsInvoiceFile(null);
      setEvidence1File(null);
      setEvidence2File(null);
      setEvidence3File(null);
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
    if (!evidence1File && !evidence2File && !evidence3File) {
      toast({
        title: "No Evidence",
        description: "Please upload at least one evidence image.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(data);
  };

  const FileUploadButton = ({ 
    label, 
    file, 
    onFileSelect, 
    onRemove,
    testId 
  }: { 
    label: string; 
    file: File | null; 
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    testId: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {!file ? (
        <div>
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={onFileSelect}
            className="hidden"
            id={testId}
            data-testid={testId}
          />
          <label htmlFor={testId}>
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate active-elevate-2">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload file</p>
            </div>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm truncate flex-1">{file.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            data-testid={`${testId}-remove`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 md:p-12">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* End User Information */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-end-user-title">
                    End User Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="endUserName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>End User Customer Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter customer name" {...field} data-testid="input-end-user-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endUserEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End User Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="customer@email.com" {...field} data-testid="input-end-user-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endUserMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End User Mobile No. *</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9999999999" {...field} data-testid="input-end-user-mobile" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Installation Details */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-installation-title">
                    Installation Details
                  </h3>
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

                {/* Studio Information */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-studio-title">
                    Studio Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="studioName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Studio Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter studio name" {...field} data-testid="input-studio-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="studioEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Studio Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="studio@email.com" {...field} data-testid="input-studio-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="studioContactNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Studio Contact No. *</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9999999999" {...field} data-testid="input-studio-contact" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Invoice Details */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-invoice-title">
                    Invoice Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="INV-001" {...field} data-testid="input-invoice-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FileUploadButton
                        label="Upload Invoice"
                        file={invoiceFile}
                        onFileSelect={(e) => {
                          if (e.target.files?.[0]) setInvoiceFile(e.target.files[0]);
                        }}
                        onRemove={() => setInvoiceFile(null)}
                        testId="input-invoice-upload"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="justSignsInvoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Just Signs Invoice Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="JS-INV-001" {...field} data-testid="input-js-invoice-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FileUploadButton
                        label="Upload Just Signs Invoice"
                        file={justSignsInvoiceFile}
                        onFileSelect={(e) => {
                          if (e.target.files?.[0]) setJustSignsInvoiceFile(e.target.files[0]);
                        }}
                        onRemove={() => setJustSignsInvoiceFile(null)}
                        testId="input-js-invoice-upload"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-product-details-title">
                    Product Details
                  </h3>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="productInstalled"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Product Installed *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-product-installed">
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="3M PPF 100 Gloss">3M PPF 100 Gloss</SelectItem>
                              <SelectItem value="3M PPF SERIES 50 GLOSS W/CAPSHT">3M PPF SERIES 50 GLOSS W/CAPSHT</SelectItem>
                              <SelectItem value="3M Scotchgard PPF Pro Series 200 Gloss">3M Scotchgard PPF Pro Series 200 Gloss</SelectItem>
                              <SelectItem value="3M PPF 150 G">3M PPF 150 G</SelectItem>
                              <SelectItem value="PRO SERIES 200 MATTE NO CAPSHT 60INX50FT -3MID">PRO SERIES 200 MATTE NO CAPSHT 60INX50FT -3MID</SelectItem>
                              <SelectItem value="3M Wrap Film">3M Wrap Film</SelectItem>
                              <SelectItem value="Window Film">Window Film</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lotNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lot Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="LOT-001" {...field} data-testid="input-lot-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Issue Section */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-issue-section-title">
                    Issue Section
                  </h3>
                  <FormField
                    control={form.control}
                    name="issue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the issue in detail..." 
                            rows={6}
                            {...field} 
                            data-testid="input-issue" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Evidence Upload Section */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-evidence-title">
                    Evidence Upload Section
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FileUploadButton
                      label="Evidence 1"
                      file={evidence1File}
                      onFileSelect={(e) => {
                        if (e.target.files?.[0]) setEvidence1File(e.target.files[0]);
                      }}
                      onRemove={() => setEvidence1File(null)}
                      testId="input-evidence-1"
                    />

                    <FileUploadButton
                      label="Evidence 2"
                      file={evidence2File}
                      onFileSelect={(e) => {
                        if (e.target.files?.[0]) setEvidence2File(e.target.files[0]);
                      }}
                      onRemove={() => setEvidence2File(null)}
                      testId="input-evidence-2"
                    />

                    <FileUploadButton
                      label="Evidence 3"
                      file={evidence3File}
                      onFileSelect={(e) => {
                        if (e.target.files?.[0]) setEvidence3File(e.target.files[0]);
                      }}
                      onRemove={() => setEvidence3File(null)}
                      testId="input-evidence-3"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Upload at least one evidence image. Supported formats: JPG, PNG, PDF
                  </p>
                </div>

                {/* Claim Details */}
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-6" data-testid="text-warranty-details-title">
                    Claim Details
                  </h3>
                  <FormField
                    control={form.control}
                    name="claimSqft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Claim SQFT / Claim SFT *</FormLabel>
                        <FormControl>
                          <Input placeholder="100" type="number" {...field} data-testid="input-claim-sqft" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitMutation.isPending || isUploading}
                    data-testid="button-submit-claim"
                  >
                    {isUploading ? "Uploading Files..." : submitMutation.isPending ? "Submitting..." : "Submit Warranty Claim"}
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
