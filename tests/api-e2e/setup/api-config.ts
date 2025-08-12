import { Config } from "shared/types";
import { TestApiBase } from "./api-base";

/**
 * Config API - Simplified with Supertest
 */
export class ConfigApi {
  constructor(private client: TestApiBase) {}

  async get(): Promise<Config> {
    return this.client.get<Config>("/api/config");
  }

  async update(data: Partial<Config>): Promise<Config> {
    return this.client.put<Config>("/api/config", data);
  }
}
