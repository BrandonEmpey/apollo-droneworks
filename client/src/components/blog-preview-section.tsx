import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { BlogCard } from "@/components/ui/blog-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

// Sample blog posts to display if no data is available from the API
const sampleBlogPosts: BlogPost[] = [
  {
    id: 1,
    title: "5 Ways Drones Are Revolutionizing Real Estate Marketing",
    content: "Full article content would go here...",
    imageUrl: "https://images.unsplash.com/photo-1506947411487-a56738267384?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "TIPS & TRICKS",
    excerpt: "Discover how aerial photography is changing the way properties are showcased and marketed to potential buyers.",
    keywords: ["real estate", "marketing", "aerial photography", "drones"],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    id: 2,
    title: "Understanding Photogrammetry: From Drone Images to 3D Models",
    content: "Full article content would go here...",
    imageUrl: "https://images.unsplash.com/photo-1579463148228-138296ac3b98?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "TECHNOLOGY",
    excerpt: "Learn about the technology behind creating accurate 3D models from aerial imagery and its practical applications.",
    keywords: ["photogrammetry", "3D modeling", "technology", "surveying"],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  {
    id: 3,
    title: "How Drones Are Transforming Construction Monitoring",
    content: "Full article content would go here...",
    imageUrl: "https://images.unsplash.com/photo-1562408590-e32931084e23?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "CASE STUDY",
    excerpt: "Explore a real-world case study showing how drone monitoring saved time and reduced costs for a major development.",
    keywords: ["construction", "monitoring", "case study", "project management"],
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
  }
];

export function BlogPreviewSection() {
  const {
    data: blogPosts,
    isLoading,
    error,
  } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  // Use sample blog posts if no data is available
  // Convert date strings to Date objects if needed
  const processedBlogPosts = blogPosts?.map(post => ({
    ...post,
    createdAt: post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt),
    updatedAt: post.updatedAt instanceof Date ? post.updatedAt : new Date(post.updatedAt)
  }));
  
  const displayBlogPosts = processedBlogPosts && processedBlogPosts.length > 0 
    ? processedBlogPosts.slice(0, 3) 
    : sampleBlogPosts;

  if (isLoading) {
    return (
      <section id="blog" className="py-20 bg-[#0b111f]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat text-gold-gradient mb-4">Latest Articles</h2>
          <p className="text-offwhite max-w-2xl mx-auto mb-10">
            Insights and updates from the world of drone services
          </p>
          <div className="flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold-gradient" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="blog" className="py-20 bg-[#0b111f]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-montserrat text-gold-gradient mb-4">Latest Articles</h2>
          <p className="text-offwhite max-w-2xl mx-auto">Insights and updates from the world of drone services</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayBlogPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/blog">
            <Button 
              variant="outline" 
              className="border-2 border-gold text-offwhite hover:bg-gold-light hover:text-gold-gradient transition-all"
            >
              View All Articles
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BlogPreviewSection;
