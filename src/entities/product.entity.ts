export class Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  tags: string[];
  slug: any;
  created_at: string;
  updated_at: string;
}
