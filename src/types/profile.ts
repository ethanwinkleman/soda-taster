export interface Profile {
  id: string;
  username: string | null;
  is_public: boolean;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}
