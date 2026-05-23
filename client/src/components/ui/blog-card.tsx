import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { BlogPost } from "@shared/schema";
import { ArrowRight } from "lucide-react";
import droneIcon from "@assets/Icon_75_px_1767372891757.png";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const { id, title, content, imageUrl, category, excerpt, createdAt } = post;

  // Format the date using date-fns
  const formattedDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <Card className="interactive-card bg-[#132642] rounded-lg overflow-hidden h-full group">
      <div className="h-48 overflow-hidden relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            console.error(`Failed to load image for blog post: ${title}`);
            // Set a fallback color instead of a broken image
            const target = e.target as HTMLImageElement;
            target.style.backgroundColor = '#080d17';
            // Use a reliable fallback image
            target.src = "https://images.pexels.com/photos/1034812/pexels-photo-1034812.jpeg?auto=compress&cs=tinysrgb&w=800";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b111f]/80 to-transparent opacity-60"></div>
        <span className="absolute bottom-3 left-3 inline-block bg-[#132642] px-2.5 py-1 rounded border border-gold/40 group-hover:border-gold group-hover:shadow-[0_0_10px_rgba(199,174,106,0.45)] transition-all duration-300">
          <span className="text-xs text-gold-gradient font-semibold font-montserrat uppercase">
            {category}
          </span>
        </span>
      </div>
      <CardContent className="p-6 flex flex-col h-[calc(100%-12rem)]">
        <div className="flex-grow">
          <Link href={`/blog/${id}`}>
            <h3 className="text-xl font-semibold font-montserrat text-offwhite group-hover:text-gold-light transition-colors duration-300 mt-2 mb-3">
              {title}
            </h3>
          </Link>
          <p className="text-offwhite/70 text-sm mb-4">{excerpt}</p>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gold-dark/20">
          <img src={droneIcon} alt="" className="h-[38px] w-[38px]" />
          <Link href={`/blog/${id}`} className="text-gold-gradient text-sm flex items-center group-hover:text-gold hover:underline">
            Read More
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default BlogCard;
