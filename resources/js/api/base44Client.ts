import axios from 'axios';

class EntityClient<T = any> {
  private endpoint: string;

  constructor(entityName: string) {
    this.endpoint = `/api/entities/${entityName.toLowerCase()}`;
  }

  async list(): Promise<T[]> {
    const res = await axios.get(this.endpoint);
    return res.data;
  }

  async filter(criteria: Record<string, any> = {}, orderBy?: string): Promise<T[]> {
    const params = { ...criteria, orderBy };
    const res = await axios.get(this.endpoint, { params });
    return res.data;
  }

  async get(id: string): Promise<T> {
    const res = await axios.get(`${this.endpoint}/${id}`);
    return res.data;
  }

  async create(data: Partial<T>): Promise<T> {
    const res = await axios.post(this.endpoint, data);
    return res.data;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const res = await axios.put(`${this.endpoint}/${id}`, data);
    return res.data;
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
    async invitation(token: string) {
      return (await axios.get(`/api/public/invitations/${encodeURIComponent(token)}`)).data;
    },
    async respondToInvitation(token: string, data: Record<string, any>) {
      return (await axios.put(`/api/public/invitations/${encodeURIComponent(token)}`, data)).data;
    },
    async createInvitationOrder(token: string, data: Record<string, any>) {
      return (await axios.post(`/api/public/invitations/${encodeURIComponent(token)}/orders`, data)).data;
    },
    async tableMenu(tableId: string) {
      return (await axios.get(`/api/public/table-menus/${tableId}`)).data;
    },
    async createTableOrder(tableId: string, data: Record<string, any>) {
      return (await axios.post(`/api/public/table-menus/${tableId}/orders`, data)).data;
    },
  },
};
