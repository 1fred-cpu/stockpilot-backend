export class Invite {
  id: string;
  business_id: string;
  store_id: string;
  role: string;
  email: string;
  invited_by: string;
  expires_at: string | Date;
  created_at: string | Date;
}
