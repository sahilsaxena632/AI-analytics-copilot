/** Unified credential shape for factory-created adapters (extend if a future DB needs extra fields). */
export type ConnectionCredentials = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
};
