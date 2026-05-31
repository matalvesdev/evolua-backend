import { supabaseAdmin } from '../../lib/supabase.js';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  readTime: number;
  author: string;
  content: string;
  featured: boolean;
}

export class BlogService {
  async list(category?: string): Promise<BlogPost[]> {
    try {
      let query = supabaseAdmin
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        category: row.category,
        image: row.cover_image,
        date: row.published_at,
        readTime: row.read_time,
        author: row.author,
        content: row.content,
        featured: row.featured,
      }));
    } catch {
      return [];
    }
  }
}

export const blogService = new BlogService();
