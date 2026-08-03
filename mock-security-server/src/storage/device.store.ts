export interface DeviceData {
  uuid: string;
  appVersion?: string;
  platform?: string;
  integrity?: string;
  registrationTime: number;
  lastSeen: number;
  riskScore: number;
}

class DeviceStore {
  private db = new Map<string, DeviceData>();

  public registerDevice(data: Omit<DeviceData, 'registrationTime' | 'lastSeen' | 'riskScore'>): DeviceData {
    const existing = this.db.get(data.uuid);
    if (existing) {
      existing.lastSeen = Date.now();
      this.db.set(data.uuid, existing);
      return existing;
    }

    const newDevice: DeviceData = {
      ...data,
      registrationTime: Date.now(),
      lastSeen: Date.now(),
      riskScore: 0
    };
    this.db.set(data.uuid, newDevice);
    return newDevice;
  }

  public updateRiskScore(uuid: string, increment: number): void {
    const device = this.db.get(uuid);
    if (device) {
      device.riskScore += increment;
      this.db.set(uuid, device);
    }
  }

  public getDevice(uuid: string): DeviceData | undefined {
    return this.db.get(uuid);
  }
}

export const deviceStore = new DeviceStore();
