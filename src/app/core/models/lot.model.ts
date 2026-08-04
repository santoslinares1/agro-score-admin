export interface AdminLot {
  id: string;
  name: string;
  fieldId: string;
  fieldName: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerFullName: string | null;
  createdAt: string;
  updatedAt: string;
}
