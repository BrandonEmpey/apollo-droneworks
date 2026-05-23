import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { BlogCard } from "@/components/ui/blog-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Filter } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

// Sample blog posts to display if no data is available from the API
const sampleBlogPosts = [
  {
    id: 1,
    title: "5 Ways Drones Are Revolutionizing Real Estate Marketing",
    content: "Full article content would go here...",
    imageUrl: "https://images.unsplash.com/photo-1506947411487-a56738267384?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "TIPS & TRICKS",
    excerpt: "Discover how aerial photography is changing the way properties are showcased and marketed to potential buyers.",
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
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
  },
  {
    id: 4,
    title: "Drone Regulations: What You Need to Know in 2023",
    content: "Full article content would go here...",
    imageUrl: "https://images.unsplash.com/photo-1508444845599-5c89863b1c44?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "REGULATIONS",
    excerpt: "Stay up to date with the latest drone regulations and requirements for commercial and recreational drone pilots.",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  },
  {
    id: 5,
    title: "The Future of Aerial Cinematography",
    content: "Full article content would go here...",
    imageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "INDUSTRY TRENDS",
    excerpt: "Explore the latest trends and technologies shaping the future of aerial cinematography and drone videography.",
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
  },
  {
    id: 6,
    title: "Best Drones for Real Estate Photography in 2023",
    content: "Full article content would go here...",
    imageUrl: "https://images.unsplash.com/photo-1592862025931-40cde3b2946f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "EQUIPMENT",
    excerpt: "Our expert recommendations for the best drones to use for professional real estate photography and videography.",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  },
];

export default function BlogPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Fetch blog posts
  const {
    data: blogPosts,
    isLoading,
    error,
  } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });
  
  // Use sample blog posts if no data is available, ensuring all dates are Date objects
  const displayBlogPosts = blogPosts && blogPosts.length > 0 
    ? blogPosts.map(post => ({
        ...post,
        createdAt: post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt),
        updatedAt: post.updatedAt instanceof Date ? post.updatedAt : new Date(post.updatedAt)
      }))
    : sampleBlogPosts;
  
  // Get unique categories
  const categoriesSet = new Set<string>();
  displayBlogPosts.forEach(post => categoriesSet.add(post.category.toLowerCase()));
  const categories = ["all", ...Array.from(categoriesSet)];
  
  // Filter blog posts based on active tab, search query, and category filter
  const filteredPosts = displayBlogPosts.filter(post => {
    // Filter by active tab (all, recent, popular, etc.)
    if (activeTab !== "all") {
      // This is a simplification - in a real app, you would have actual data for these tabs
      if (activeTab === "recent" && new Date(post.createdAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        return false;
      }
      // For demonstration, we'll just show the first 3 posts when "popular" is selected
      if (activeTab === "popular" && post.id > 3) {
        return false;
      }
    }
    
    // Filter by search query
    if (searchQuery && 
        !post.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by category
    if (categoryFilter !== "all" && 
        post.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Blog | Apollo DroneWorks</title>
        <meta name="description" content="Latest insights, tips, and updates from the world of professional drone services including real estate photography, construction monitoring, and 3D modeling." />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#080d17] to-[#0b111f]">
        <Header />
        
        <main className="flex-grow pt-32 pb-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-3xl sm:text-5xl font-bold font-montserrat text-gold-gradient mb-6">Blog & Insights</h1>
              <p className="text-offwhite max-w-2xl mx-auto leading-relaxed">
                Explore our latest articles, tips, and industry insights about drone technology and aerial imagery.
              </p>
            </div>

            {/* Tabs - Moved to top for better visual hierarchy */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="mb-10"
            >
              <div className="flex justify-center mb-8">
                <TabsList className="h-12 bg-[#132642] border border-gold-dark/30 p-1 rounded-md max-w-[360px] mx-auto justify-center">
                  <TabsTrigger 
                    value="all" 
                    className="h-10 px-6 rounded data-[state=active]:bg-[#080d17] data-[state=active]:text-gold-light data-[state=active]:font-medium data-[state=active]:shadow-sm"
                  >
                    All Articles
                  </TabsTrigger>
                  <TabsTrigger 
                    value="recent" 
                    className="h-10 px-6 rounded data-[state=active]:bg-[#080d17] data-[state=active]:text-gold-light data-[state=active]:font-medium data-[state=active]:shadow-sm"
                  >
                    Recent
                  </TabsTrigger>
                  <TabsTrigger 
                    value="popular" 
                    className="h-10 px-6 rounded data-[state=active]:bg-[#080d17] data-[state=active]:text-gold-light data-[state=active]:font-medium data-[state=active]:shadow-sm"
                  >
                    Popular
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
            
            {/* Search and Filter */}
            <div className="mb-12 flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full sm:w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-light/70" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#080d17] border-gold-dark/30 pl-10 text-offwhite focus:border-gold-light/50"
                />
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="h-5 w-5 text-gold-light/70" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] bg-[#080d17] border-gold-dark/30 text-offwhite">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#132642] border-gold-dark/30">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.filter(cat => cat !== "all").map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-gold" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">Error loading blog posts.</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-gold text-black hover:bg-gold-light"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#132642] rounded-lg">
                <p className="text-offwhite mb-2">No articles found matching your criteria.</p>
                <p className="text-offwhite/70 mb-4">Try adjusting your search or filter.</p>
                <Button 
                  onClick={() => {
                    setActiveTab("all");
                    setSearchQuery("");
                    setCategoryFilter("all");
                  }}
                  className="bg-gold text-black hover:bg-gold-light"
                >
                  Reset Filters
                </Button>
              </div>
            )}
            
            {/* Newsletter Signup */}
            <div className="mt-24 bg-gradient-to-r from-[#132642] to-[#18304e] p-10 rounded-lg border border-gold-dark/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-gold-light/5 to-gold-dark/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-gold-dark/10 to-gold-light/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
              
              <div className="max-w-2xl mx-auto text-center relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold font-montserrat text-gold-gradient mb-8">
                  Stay Ahead with Drone Insights
                </h2>
                <p className="text-offwhite mb-8 leading-relaxed">
                  Subscribe to our newsletter and get the latest industry trends, drone technology updates, and exclusive tips delivered directly to your inbox.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <Input
                    placeholder="Your email address"
                    className="bg-[#080d17] border-gold-dark/30 text-offwhite focus:border-gold-light/50"
                  />
                  <Button 
                    className="bg-[#1d1d1d] border border-gold-dark hover:border-gold-light text-offwhite hover:text-gold-light font-montserrat font-medium transition-all duration-300 shrink-0 relative group overflow-hidden"
                    onClick={() => alert("This would subscribe to the newsletter in a real application")}
                  >
                    <span className="relative z-10">Subscribe</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-gold-dark to-gold-light opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                  </Button>
                </div>
                <p className="text-offwhite/50 text-xs mt-6">
                  We respect your privacy and will never share your information. Unsubscribe at any time.
                </p>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
