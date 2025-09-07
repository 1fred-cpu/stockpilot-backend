export class User {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
  status: string;
  business_id: string;
  user: {
    name: string | null;
    email: string | null;
  };
}
