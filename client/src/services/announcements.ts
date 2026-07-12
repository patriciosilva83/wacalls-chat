import { apiGet, apiPost, apiDelete, apiPut } from "@/lib/api";

export type Announcement = {
  id: string;
  title: string;
  message: string;
  ownerId: string;
  tenantId: string;
  createdAt: number;
};

export async function listAnnouncements(): Promise<Announcement[]> {
  return apiGet("/api/announcements");
}

export async function createAnnouncement(data: {
  title: string;
  message: string;
}): Promise<Announcement> {
  return apiPost("/api/announcements", data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return apiDelete(`/api/announcements/${id}`);
}

export async function updateAnnouncement(
  id: string,
  data: { title: string; message: string }
): Promise<void> {
  return apiPut(`/api/announcements/${id}`, data);
}
