import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Download, LogOut, Mail, Shield as ShieldIcon, ExternalLink, Plus, Pencil, Trash2, FileText, Upload, Image, File } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ContactSubmission, WarrantyClaim, BlogPost, MarketingCollateral } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("contacts");
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [collateralDialogOpen, setCollateralDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [editingCollateral, setEditingCollateral] = useState<MarketingCollateral | null>(null);

  const { data: contactSubmissions, isLoading: isLoadingContacts } = useQuery<ContactSubmission[]>({
    queryKey: ["/api/admin/contact-submissions"],
  });

  const { data: warrantyClaims, isLoading: isLoadingClaims } = useQuery<WarrantyClaim[]>({
    queryKey: ["/api/admin/warranty-claims"],
  });

  const { data: blogPosts, isLoading: isLoadingBlog } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
  });

  const { data: collaterals, isLoading: isLoadingCollateral } = useQuery<MarketingCollateral[]>({
    queryKey: ["/api/admin/marketing-collateral"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/logout", {});
    },
    onSuccess: () => {
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      setLocation("/admin");
    },
    onError: () => {
      setLocation("/admin");
    },
  });

  const createBlogMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/blog", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setBlogDialogOpen(false);
      setEditingBlog(null);
      toast({ title: "Success", description: "Blog post created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create blog post.", variant: "destructive" });
    },
  });

  const updateBlogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/admin/blog/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setBlogDialogOpen(false);
      setEditingBlog(null);
      toast({ title: "Success", description: "Blog post updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update blog post.", variant: "destructive" });
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/blog/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({ title: "Success", description: "Blog post deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete blog post.", variant: "destructive" });
    },
  });

  const createCollateralMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/marketing-collateral", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-collateral"] });
      setCollateralDialogOpen(false);
      setEditingCollateral(null);
      toast({ title: "Success", description: "Marketing collateral created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create marketing collateral.", variant: "destructive" });
    },
  });

  const updateCollateralMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/admin/marketing-collateral/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-collateral"] });
      setCollateralDialogOpen(false);
      setEditingCollateral(null);
      toast({ title: "Success", description: "Marketing collateral updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update marketing collateral.", variant: "destructive" });
    },
  });

  const deleteCollateralMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/marketing-collateral/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-collateral"] });
      toast({ title: "Success", description: "Marketing collateral deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete marketing collateral.", variant: "destructive" });
    },
  });

  const handleLogout = () => logoutMutation.mutate();
  const handleExportContacts = () => {
    window.open("/api/admin/export/contacts", "_blank");
    toast({ title: "Exporting Data", description: "Contact submissions CSV download started." });
  };
  const handleExportWarranty = () => {
    window.open("/api/admin/export/warranty-claims", "_blank");
    toast({ title: "Exporting Data", description: "Warranty claims CSV download started." });
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
                <h1 className="font-serif font-bold text-xl" data-testid="text-dashboard-title">Admin Dashboard</h1>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Contacts</p>
            <p className="text-2xl font-bold">{contactSubmissions?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Claims</p>
            <p className="text-2xl font-bold">{warrantyClaims?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Blog Posts</p>
            <p className="text-2xl font-bold">{blogPosts?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Downloads</p>
            <p className="text-2xl font-bold">{collaterals?.length || 0}</p>
          </Card>
        </div>

        {/* Data Tables */}
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
                <TabsTrigger value="warranty" data-testid="tab-warranty">Warranty Claims</TabsTrigger>
                <TabsTrigger value="blog" data-testid="tab-blog">Blog</TabsTrigger>
                <TabsTrigger value="collateral" data-testid="tab-collateral">Downloads</TabsTrigger>
              </TabsList>
              
              {activeTab === "contacts" && (
                <Button variant="outline" onClick={handleExportContacts} data-testid="button-export-contacts">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
              {activeTab === "warranty" && (
                <Button variant="outline" onClick={handleExportWarranty} data-testid="button-export-warranty">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
              {activeTab === "blog" && (
                <Dialog open={blogDialogOpen} onOpenChange={(open) => { setBlogDialogOpen(open); if (!open) setEditingBlog(null); }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-blog">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingBlog ? "Edit Blog Post" : "Create Blog Post"}</DialogTitle>
                    </DialogHeader>
                    <BlogForm 
                      post={editingBlog} 
                      onSubmit={(data) => {
                        if (editingBlog) {
                          updateBlogMutation.mutate({ id: editingBlog.id, data });
                        } else {
                          createBlogMutation.mutate(data);
                        }
                      }}
                      isPending={createBlogMutation.isPending || updateBlogMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              )}
              {activeTab === "collateral" && (
                <Dialog open={collateralDialogOpen} onOpenChange={(open) => { setCollateralDialogOpen(open); if (!open) setEditingCollateral(null); }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-collateral">
                      <Plus className="w-4 h-4 mr-2" />
                      Add File
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingCollateral ? "Edit Marketing Collateral" : "Add Marketing Collateral"}</DialogTitle>
                    </DialogHeader>
                    <CollateralForm 
                      collateral={editingCollateral} 
                      onSubmit={(data) => {
                        if (editingCollateral) {
                          updateCollateralMutation.mutate({ id: editingCollateral.id, data });
                        } else {
                          createCollateralMutation.mutate(data);
                        }
                      }}
                      isPending={createCollateralMutation.isPending || updateCollateralMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-0">
              {isLoadingContacts ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
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
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No contact submissions yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Warranty Claims Tab */}
            <TabsContent value="warranty" className="mt-0">
              {isLoadingClaims ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : warrantyClaims && warrantyClaims.length > 0 ? (
                <div className="space-y-6">
                  {warrantyClaims.map((claim) => (
                    <Card key={claim.id} className="p-6" data-testid={`card-claim-${claim.id}`}>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b">
                          <div>
                            <h3 className="font-bold text-lg">Claim #{claim.id}</h3>
                            <p className="text-sm text-muted-foreground">Submitted: {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <Badge variant="secondary">{claim.productInstalled}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><p className="text-sm font-medium text-muted-foreground">End User</p><p className="text-sm">{claim.endUserName}</p></div>
                          <div><p className="text-sm font-medium text-muted-foreground">Email</p><p className="text-sm">{claim.endUserEmail}</p></div>
                          <div><p className="text-sm font-medium text-muted-foreground">Mobile</p><p className="text-sm">{claim.endUserMobile}</p></div>
                          <div><p className="text-sm font-medium text-muted-foreground">Studio</p><p className="text-sm">{claim.studioName}</p></div>
                          <div><p className="text-sm font-medium text-muted-foreground">Installation Date</p><p className="text-sm">{claim.installationDate}</p></div>
                          <div><p className="text-sm font-medium text-muted-foreground">Claim SQFT</p><p className="text-sm">{claim.claimSqft}</p></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Issue</p>
                          <p className="text-sm bg-muted p-4 rounded-lg">{claim.issue}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {claim.invoiceUrl && <Button variant="outline" size="sm" onClick={() => window.open(claim.invoiceUrl!, '_blank')}><ExternalLink className="w-3 h-3 mr-1" />Invoice</Button>}
                          {claim.justSignsInvoiceUrl && <Button variant="outline" size="sm" onClick={() => window.open(claim.justSignsInvoiceUrl!, '_blank')}><ExternalLink className="w-3 h-3 mr-1" />JS Invoice</Button>}
                          {claim.evidence1Url && <Button variant="outline" size="sm" onClick={() => window.open(claim.evidence1Url!, '_blank')}><ExternalLink className="w-3 h-3 mr-1" />Evidence 1</Button>}
                          {claim.evidence2Url && <Button variant="outline" size="sm" onClick={() => window.open(claim.evidence2Url!, '_blank')}><ExternalLink className="w-3 h-3 mr-1" />Evidence 2</Button>}
                          {claim.evidence3Url && <Button variant="outline" size="sm" onClick={() => window.open(claim.evidence3Url!, '_blank')}><ExternalLink className="w-3 h-3 mr-1" />Evidence 3</Button>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">No warranty claims yet</div>
              )}
            </TabsContent>

            {/* Blog Tab */}
            <TabsContent value="blog" className="mt-0">
              {isLoadingBlog ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : blogPosts && blogPosts.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blogPosts.map((post) => (
                        <TableRow key={post.id} data-testid={`row-blog-${post.id}`}>
                          <TableCell className="font-medium">{post.title}</TableCell>
                          <TableCell className="text-muted-foreground">{post.slug}</TableCell>
                          <TableCell>
                            <Badge variant={post.published === "true" ? "default" : "secondary"}>
                              {post.published === "true" ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingBlog(post); setBlogDialogOpen(true); }}
                                data-testid={`button-edit-blog-${post.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { if (confirm("Delete this blog post?")) deleteBlogMutation.mutate(post.id); }}
                                data-testid={`button-delete-blog-${post.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">No blog posts yet. Click "Add Post" to create one.</div>
              )}
            </TabsContent>

            {/* Marketing Collateral Tab */}
            <TabsContent value="collateral" className="mt-0">
              {isLoadingCollateral ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : collaterals && collaterals.length > 0 ? (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collaterals.map((item) => (
                        <TableRow key={item.id} data-testid={`row-collateral-${item.id}`}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.fileType.includes("pdf") ? "PDF" : item.fileType.includes("image") ? "Image" : "Doc"}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(item.fileUrl, '_blank')}
                                data-testid={`button-view-collateral-${item.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingCollateral(item); setCollateralDialogOpen(true); }}
                                data-testid={`button-edit-collateral-${item.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { if (confirm("Delete this file?")) deleteCollateralMutation.mutate(item.id); }}
                                data-testid={`button-delete-collateral-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">No marketing collateral yet. Click "Add File" to upload one.</div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}

function BlogForm({ post, onSubmit, isPending }: { post: BlogPost | null; onSubmit: (data: any) => void; isPending: boolean }) {
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featuredImageUrl || "");
  const [published, setPublished] = useState(post?.published === "true");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!post) {
      setSlug(generateSlug(value));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await fetch("/api/upload-url", { method: "POST" });
      const data = await response.json();
      
      await fetch(data.uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      
      setFeaturedImageUrl(data.objectPath);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      slug,
      excerpt,
      content,
      featuredImageUrl: featuredImageUrl || null,
      published: published ? "true" : "false",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required data-testid="input-blog-title" />
      </div>
      <div>
        <Label htmlFor="slug">URL Slug</Label>
        <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required data-testid="input-blog-slug" />
      </div>
      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required rows={2} data-testid="input-blog-excerpt" />
      </div>
      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required rows={8} data-testid="input-blog-content" />
      </div>
      <div>
        <Label htmlFor="featuredImage">Featured Image</Label>
        <div className="flex gap-2">
          <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} data-testid="input-blog-image" />
        </div>
        {featuredImageUrl && <p className="text-sm text-muted-foreground mt-1">Image uploaded: {featuredImageUrl}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Switch id="published" checked={published} onCheckedChange={setPublished} data-testid="switch-blog-published" />
        <Label htmlFor="published">Published</Label>
      </div>
      <Button type="submit" disabled={isPending || isUploading} className="w-full" data-testid="button-save-blog">
        {isPending ? "Saving..." : post ? "Update Post" : "Create Post"}
      </Button>
    </form>
  );
}

function CollateralForm({ collateral, onSubmit, isPending }: { collateral: MarketingCollateral | null; onSubmit: (data: any) => void; isPending: boolean }) {
  const [title, setTitle] = useState(collateral?.title || "");
  const [description, setDescription] = useState(collateral?.description || "");
  const [category, setCategory] = useState(collateral?.category || "Brochures");
  const [fileUrl, setFileUrl] = useState(collateral?.fileUrl || "");
  const [fileType, setFileType] = useState(collateral?.fileType || "");
  const [fileName, setFileName] = useState(collateral?.fileName || "");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await fetch("/api/upload-url", { method: "POST" });
      const data = await response.json();
      
      await fetch(data.uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      
      setFileUrl(data.objectPath);
      setFileType(file.type);
      setFileName(file.name);
      toast({ title: "File uploaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl && !collateral) {
      toast({ title: "Error", description: "Please upload a file", variant: "destructive" });
      return;
    }
    onSubmit({
      title,
      description: description || null,
      category,
      fileUrl: fileUrl || collateral?.fileUrl,
      fileType: fileType || collateral?.fileType,
      fileName: fileName || collateral?.fileName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required data-testid="input-collateral-title" />
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} data-testid="input-collateral-description" />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="select-collateral-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Brochures">Brochures</SelectItem>
            <SelectItem value="Product Catalogs">Product Catalogs</SelectItem>
            <SelectItem value="Technical Sheets">Technical Sheets</SelectItem>
            <SelectItem value="Installation Guides">Installation Guides</SelectItem>
            <SelectItem value="Promotional Materials">Promotional Materials</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="file">Upload File (PDF, Image, Doc)</Label>
        <Input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileUpload} disabled={isUploading} data-testid="input-collateral-file" />
        {fileName && <p className="text-sm text-muted-foreground mt-1">File: {fileName}</p>}
      </div>
      <Button type="submit" disabled={isPending || isUploading} className="w-full" data-testid="button-save-collateral">
        {isPending ? "Saving..." : collateral ? "Update" : "Add File"}
      </Button>
    </form>
  );
}
