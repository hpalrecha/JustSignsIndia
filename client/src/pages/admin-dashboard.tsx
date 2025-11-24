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
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Center</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Images</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warrantyClaims && warrantyClaims.length > 0 ? (
                        warrantyClaims.map((claim) => (
                          <TableRow key={claim.id} data-testid={`row-claim-${claim.id}`}>
                            <TableCell className="font-medium">{claim.customerName}</TableCell>
                            <TableCell>{claim.phone}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{claim.productType}</Badge>
                            </TableCell>
                            <TableCell>{claim.installationCenter}</TableCell>
                            <TableCell className="max-w-xs truncate">{claim.issueDescription}</TableCell>
                            <TableCell>
                              {claim.imageUrls && claim.imageUrls.length > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "Image URLs",
                                      description: `${claim.imageUrls.length} image(s) uploaded`,
                                    });
                                  }}
                                  data-testid={`button-view-images-${claim.id}`}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  {claim.imageUrls.length}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell>{claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No warranty claims yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
