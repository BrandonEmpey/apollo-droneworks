import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/header";
import { BlogManager } from "@/components/admin/blog-manager";
import type { BlogPost } from "@shared/schema";

export default function BlogManagement() {
  const { data: blogPosts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  return (
    <>
      <Helmet>
        <title>Blog Management - Apollo DroneWorks Admin</title>
      </Helmet>
      <Header />
      <main className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/content">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Content
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-offwhite">Blog Management</h1>
            <p className="text-sm text-offwhite/60 mt-1">
              Create, edit, and manage all blog posts
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <BlogManager blogPosts={blogPosts} />
        )}
      </main>
    </>
  );
}
