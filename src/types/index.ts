export type Gender = 'MALE' | 'FEMALE';

export type RelationshipType = 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING';

export interface Person {
  id: string;
  name: string;
  nickname: string | null;
  honorific: string | null;
  gender: string | null;
  birth_date: string | null;
  is_dead: boolean;
  death_date: string | null;
  photo_url: string | null;
  additional_information: string | null;
  order_index: number | null;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  person1_id: string;
  person2_id: string;
  relationship_type: RelationshipType;
  created_at: string;
  updated_at: string;
}

export interface PersonFormData {
  name: string;
  nickname?: string;
  honorific?: string;
  gender?: string;
  birth_date?: string;
  is_dead?: boolean;
  death_date?: string;
  photo_url?: string;
  additional_information?: string;
  order_index?: number;
}
