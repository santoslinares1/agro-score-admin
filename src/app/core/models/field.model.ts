export interface AdminField {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerFullName: string | null;
  lotsCount: number;
  createdAt: string;
  updatedAt: string;
}
