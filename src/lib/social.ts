export type SocialAccess = { ready: boolean; missing: string[]; visible: boolean };
export type DiscoverProfile = {
  id: string; displayName: string; age: number; city: string | null;
  bio: string | null; relationshipGoal: string | null;
  occupation: string | null; interests: string[]; coreValues: string[];
  photoUrl: string | null;
};
export type DiscoverResponse = { access: SocialAccess; profiles: DiscoverProfile[] };
export type LikeResponse = { matched: boolean; matchId: string | null };
export type MatchCard = { id: string; memberId: string; name: string;
  city: string | null; createdAt: string; photoUrl: string | null };
export type Message = { id: string; senderId: string; content: string; createdAt: string };
