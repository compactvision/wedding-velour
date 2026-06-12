import axios from 'axios';
import { cachedGet, createOfflineId, queuedMutation } from '@/lib/offline';

class EntityClient<T = any> {
  private endpoint: string;

  constructor(entityName: string) {
    this.endpoint = `/api/entities/${entityName.toLowerCase()}`;
  }

  async list(): Promise<T[]> {
    return cachedGet<T[]>(this.endpoint);
  }

  async filter(criteria: Record<string, any> = {}, orderBy?: string): Promise<T[]> {
    const params = { ...criteria, orderBy };
    return cachedGet<T[]>(this.endpoint, { params });
  }

  async get(id: string): Promise<T> {
    return cachedGet<T>(`${this.endpoint}/${id}`);
  }

  async create(data: Partial<T>): Promise<T> {
    const res = await axios.post(this.endpoint, data);
    return res.data;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return queuedMutation<T>(
      'put',
      `${this.endpoint}/${id}`,
      data as Record<string, unknown>,
      `Mise à jour ${this.endpoint.split('/').pop()}`,
      { id, ...data, _offline_pending: true } as T,
    );
  }

  async delete(id: string): Promise<void> {
    await axios.delete(`${this.endpoint}/${id}`);
  }

  subscribe(callback: (event: any) => void): () => void {
    // Poll the backend every 3 seconds to trigger invalidations / real-time updates
    const interval = setInterval(() => {
      callback({ type: 'poll' });
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }
}

export const base44 = {
  entities: {
    Wedding: new EntityClient('wedding'),
    WeddingTable: new EntityClient('weddingtable'),
    Guest: new EntityClient('guest'),
    MenuItem: new EntityClient('menuitem'),
    Order: new EntityClient('order'),
    Photo: new EntityClient('photo'),
    TimelineEvent: new EntityClient('timelineevent'),
    WeddingNotification: new EntityClient('weddingnotification'),
  },
  integrations: {
    Core: {
      async UploadFile({ file }: { file: File }): Promise<{ file_url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data;
      },
    },
  },
  public: {
    async invitation(token: string): Promise<any> {
      return cachedGet<any>(`/api/public/invitations/${encodeURIComponent(token)}`);
    },
    async respondToInvitation(token: string, data: Record<string, any>) {
      return queuedMutation(
        'put',
        `/api/public/invitations/${encodeURIComponent(token)}`,
        data,
        'Réponse à l’invitation',
        { ...data, _offline_pending: true },
      );
    },
    async createInvitationOrder(token: string, data: Record<string, any>) {
      const offlineUuid = data.offline_uuid || createOfflineId();
      return queuedMutation(
        'post',
        `/api/public/invitations/${encodeURIComponent(token)}/orders`,
        { ...data, offline_uuid: offlineUuid },
        'Commande invité',
        {
          id: offlineUuid,
          ...data,
          offline_uuid: offlineUuid,
          status: 'pending_sync',
          created_date: new Date().toISOString(),
          _offline_pending: true,
        },
      );
    },
    async tableMenu(tableId: string): Promise<any> {
      return cachedGet<any>(`/api/public/table-menus/${tableId}`);
    },
    async createTableOrder(tableId: string, data: Record<string, any>) {
      const offlineUuid = data.offline_uuid || createOfflineId();
      return queuedMutation(
        'post',
        `/api/public/table-menus/${tableId}/orders`,
        { ...data, offline_uuid: offlineUuid },
        'Commande à table',
        {
          id: offlineUuid,
          ...data,
          offline_uuid: offlineUuid,
          status: 'pending_sync',
          created_date: new Date().toISOString(),
          _offline_pending: true,
        },
      );
    },
  },
};
