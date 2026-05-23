import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { BlogPost } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, Calendar, Tag, Clock, Share2, Facebook, Twitter, Linkedin, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

// Estimate read time based on content length
function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Format HTML content to prevent XSS issues
function formatHTML(html: string): { __html: string } {
  return { __html: html };
}

export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:id");
  const postId = params?.id ? parseInt(params.id) : null;

  // Scroll to top when the page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [postId]);

  // Fetch blog post by id
  const {
    data: post,
    isLoading,
    error,
  } = useQuery<BlogPost | null>({
    queryKey: ["/api/blog", postId],
    enabled: !!postId,
    queryFn: async () => {
      const response = await fetch(`/api/blog/${postId}`);
      if (!response.ok) {
        throw new Error("Blog post not found");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <Skeleton className="h-10 w-3/4 bg-[#132642] mb-4" />
            <Skeleton className="h-6 w-1/2 bg-[#132642] mb-8" />
            <Skeleton className="h-[400px] w-full bg-[#132642] mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full bg-[#132642]" />
              <Skeleton className="h-4 w-full bg-[#132642]" />
              <Skeleton className="h-4 w-3/4 bg-[#132642]" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        <main className="flex-grow pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-offwhite mb-4">Blog Post Not Found</h1>
            <p className="text-offwhite/70 mb-8">The article you're looking for doesn't exist or has been removed.</p>
            <Link href="/blog">
              <Button className="bg-gold hover:bg-gold-light text-black">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formattedDate = format(new Date(post.createdAt), "MMMM d, yyyy");
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const readTime = estimateReadTime(post.content);
  
  // Get current URL for sharing
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <Helmet>
        <title>{post.title} | Apollo DroneWorks Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.imageUrl} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* Back to blog link */}
            <Link href="/blog" className="flex items-center text-offwhite/80 hover:text-gold-light mb-8 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>Back to Blog</span>
            </Link>
            
            {/* Category tag */}
            <div className="mb-6">
              <span className="inline-block bg-[#132642] px-3 py-1 rounded-full border border-gold/40 transition-all duration-300">
                <span className="text-gold-gradient font-semibold font-montserrat uppercase text-xs">
                  {post.category}
                </span>
              </span>
            </div>
            
            {/* Title and meta info */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat text-gold-gradient mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-offwhite/70 mb-8">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-gold-light/70" />
                <span title={formattedDate}>{timeAgo}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-gold-light/70" />
                <span>{readTime} min read</span>
              </div>
              
              <div className="flex items-center">
                <Tag className="mr-2 h-4 w-4 text-gold-light/70" />
                <span>{post.category}</span>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-offwhite/70 hover:text-gold-light hover:bg-transparent p-0">
                    <Share2 className="mr-2 h-4 w-4" />
                    <span>Share</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] bg-[#132642] border border-gold-dark/30">
                  <div className="grid gap-2">
                    <h4 className="font-semibold text-sm text-offwhite mb-2">Share this article</h4>
                    <div className="flex justify-between">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-offwhite/70 hover:text-[#1877F2] hover:bg-transparent"
                        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank')}
                      >
                        <Facebook className="h-4 w-4" />
                        <span className="sr-only">Share on Facebook</span>
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-offwhite/70 hover:text-[#1DA1F2] hover:bg-transparent"
                        onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(post.title)}`, '_blank')}
                      >
                        <Twitter className="h-4 w-4" />
                        <span className="sr-only">Share on Twitter</span>
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-offwhite/70 hover:text-[#0A66C2] hover:bg-transparent"
                        onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`, '_blank')}
                      >
                        <Linkedin className="h-4 w-4" />
                        <span className="sr-only">Share on LinkedIn</span>
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-offwhite/70 hover:text-[#EA4335] hover:bg-transparent"
                        onClick={() => window.open(`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(`Check out this article: ${currentUrl}`)}`, '_blank')}
                      >
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Share via Email</span>
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Featured image */}
            <div className="mb-10 rounded-lg overflow-hidden border border-gold-dark/30">
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="w-full h-auto max-h-[500px] object-cover"
                onError={(e) => {
                  console.error(`Failed to load featured image for blog post: ${post.title}`);
                  // Set a fallback color instead of a broken image
                  const target = e.target as HTMLImageElement;
                  target.style.backgroundColor = '#080d17';
                  // Use a consistent fallback image from the same source as blog card
                  target.src = "https://images.pexels.com/photos/1034812/pexels-photo-1034812.jpeg?auto=compress&cs=tinysrgb&w=800";
                }}
              />
            </div>
            
            {/* Article content */}
            <article className="prose prose-invert prose-gold max-w-none">
              <div dangerouslySetInnerHTML={formatHTML(post.content)} />
            </article>
            
            <Separator className="my-12 bg-gold-dark/30" />
            
            {/* Author and tags section */}
            <div className="flex flex-wrap justify-between items-center gap-8">
              <div className="flex items-center">
                <Logo size="sm" className="border border-gold-dark/30 rounded-lg p-1 bg-[#132642]/50" />
                <div className="ml-4">
                  <p className="text-offwhite font-medium">Apollo DroneWorks</p>
                  <p className="text-sm text-offwhite/70">Professional Drone Services</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-offwhite/70 mr-2">Tags:</span>
                <Link href={`/blog?category=${encodeURIComponent(post.category.toLowerCase())}`}>
                  <span className="text-sm bg-[#080d17] px-3 py-1 rounded-full text-gold-light border border-gold-dark/30 hover:border-gold-light/50 transition-colors">
                    {post.category}
                  </span>
                </Link>
                <span className="text-sm bg-[#080d17] px-3 py-1 rounded-full text-gold-light border border-gold-dark/30 hover:border-gold-light/50 transition-colors">
                  Drone Services
                </span>
                <span className="text-sm bg-[#080d17] px-3 py-1 rounded-full text-gold-light border border-gold-dark/30 hover:border-gold-light/50 transition-colors">
                  Aerial Photography
                </span>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}