import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Download, LogOut, Mail, Shield as ShieldIcon, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ContactSubmission, WarrantyClaim } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("contacts");

  const { data: contactSubmissions, isLoading: isLoadingContacts } = useQuery<ContactSubmission[]>({
    queryKey: ["/api/admin/contact-submissions"],
  });

  const { data: warrantyClaims, isLoading: isLoadingClaims } = useQuery<WarrantyClaim[]>({
    queryKey: ["/api/admin/warranty-claims"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/logout", {});
    },
    onSuccess: () => {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation("/admin");
    },
    onError: () => {
      setLocation("/admin");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleExportContacts = () => {
    window.open("/api/admin/export/contacts", "_blank");
    toast({
      title: "Exporting Data",
      description: "Contact submissions CSV download started.",
    });
  };

  const handleExportWarranty = () => {
    window.open("/api/admin/export/warranty-claims", "_blank");
    toast({
      title: "Exporting Data",
      description: "Warranty claims CSV download started.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-xl" data-testid="text-dashboard-title">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">Just Signs India</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} disabled={logoutMutation.isPending} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Contacts</p>
                {isLoadingContacts ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-total-contacts">
                    {contactSubmissions?.length || 0}
                  </p>
                )}
              </div>
              <Mail className="w-10 h-10 text-primary/20" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Warranty Claims</p>
                {isLoadingClaims ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-total-claims">
                    {warrantyClaims?.length || 0}
                  </p>
                )}
              </div>
              <ShieldIcon className="w-10 h-10 text-primary/20" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
                {isLoadingContacts || isLoadingClaims ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <p className="text-3xl font-bold" data-testid="text-month-total">
                    {(contactSubmissions?.length || 0) + (warrantyClaims?.length || 0)}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-lg">All</Badge>
            </div>
          </Card>
        </div>

        {/* Data Tables */}
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <TabsList>
                <TabsTrigger value="contacts" data-testid="tab-contacts">
                  Contact Submissions
                </TabsTrigger>
                <TabsTrigger value="warranty" data-testid="tab-warranty">
                  Warranty Claims
                </TabsTrigger>
              </TabsList>
              
              {activeTab === "contacts" ? (
                <Button variant="outline" onClick={handleExportContacts} data-testid="button-export-contacts">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              ) : (
                <Button variant="outline" onClick={handleExportWarranty} data-testid="button-export-warranty">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>

            <TabsContent value="contacts" className="mt-0">
              {isLoadingContacts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactSubmissions && contactSubmissions.length > 0 ? (
                        contactSubmissions.map((submission) => (
                          <TableRow key={submission.id} data-testid={`row-contact-${submission.id}`}>
                            <TableCell className="font-medium">{submission.name}</TableCell>
                            <TableCell>{submission.phone}</TableCell>
                            <TableCell>{submission.email}</TableCell>
                            <TableCell>{submission.city}</TableCell>
                            <TableCell className="max-w-xs truncate">{submission.message}</TableCell>
                            <TableCell>{submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No contact submissions yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="warranty" className="mt-0">
              {isLoadingClaims ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : warrantyClaims && warrantyClaims.length > 0 ? (
                <div className="space-y-6">
                  {warrantyClaims.map((claim) => (
                    <Card key={claim.id} className="p-6" data-testid={`card-claim-${claim.id}`}>
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b">
                          <div>
                            <h3 className="font-bold text-lg">Claim #{claim.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              Submitted: {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <Badge variant="secondary">{claim.productInstalled}</Badge>
                        </div>

                        {/* Issue Information */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Issue Date</p>
                            <p className="text-sm">{claim.issueDate}</p>
                          </div>
                        </div>

                        {/* End User Information */}
                        <div>
                          <h4 className="font-semibold mb-3">End User Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Name</p>
                              <p className="text-sm">{claim.endUserName}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Email</p>
                              <p className="text-sm">{claim.endUserEmail}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                              <p className="text-sm">{claim.endUserMobile}</p>
                            </div>
                          </div>
                        </div>

                        {/* Studio Information */}
                        <div>
                          <h4 className="font-semibold mb-3">Studio Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Studio Name</p>
                              <p className="text-sm">{claim.studioName}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Studio Email</p>
                              <p className="text-sm">{claim.studioEmail}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Studio Contact</p>
                              <p className="text-sm">{claim.studioContactNo}</p>
                            </div>
                          </div>
                        </div>

                        {/* Installation & Invoice Details */}
                        <div>
                          <h4 className="font-semibold mb-3">Installation & Invoice Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Installation Date</p>
                              <p className="text-sm">{claim.installationDate}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                              <p className="text-sm">{claim.invoiceNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">JS Invoice Number</p>
                              <p className="text-sm">{claim.justSignsInvoiceNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Lot Number</p>
                              <p className="text-sm">{claim.lotNumber}</p>
                            </div>
                            {claim.invoiceUrl && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Invoice</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(claim.invoiceUrl!, '_blank')}
                                  className="p-0 h-auto text-primary"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}
                            {claim.justSignsInvoiceUrl && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">JS Invoice</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(claim.justSignsInvoiceUrl!, '_blank')}
                                  className="p-0 h-auto text-primary"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Item & Warranty Details */}
                        <div>
                          <h4 className="font-semibold mb-3">Item & Warranty Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Product Installed</p>
                              <p className="text-sm">{claim.productInstalled}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Claim SQFT</p>
                              <p className="text-sm">{claim.claimSqft}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Claim Value</p>
                              <p className="text-sm font-semibold">{claim.claimValue}</p>
                            </div>
                          </div>
                        </div>

                        {/* Issue Description */}
                        <div>
                          <h4 className="font-semibold mb-3">Issue Description</h4>
                          <p className="text-sm bg-muted p-4 rounded-lg">{claim.issue}</p>
                        </div>

                        {/* Evidence Images */}
                        <div>
                          <h4 className="font-semibold mb-3">Evidence</h4>
                          <div className="grid grid-cols-3 gap-4">
                            {claim.evidence1Url && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Evidence 1</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(claim.evidence1Url!, '_blank')}
                                  className="w-full"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}
                            {claim.evidence2Url && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Evidence 2</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(claim.evidence2Url!, '_blank')}
                                  className="w-full"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}
                            {claim.evidence3Url && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Evidence 3</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(claim.evidence3Url!, '_blank')}
                                  className="w-full"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}
                            {!claim.evidence1Url && !claim.evidence2Url && !claim.evidence3Url && (
                              <p className="text-sm text-muted-foreground col-span-3">No evidence uploaded</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  No warranty claims yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
