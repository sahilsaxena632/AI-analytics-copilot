import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "enc:v1:";
const SALT = "analytics-copilot-credential-v1";

@Injectable()
export class CredentialEncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>("CREDENTIAL_ENCRYPTION_KEY");
    this.key = scryptSync(secret, SALT, 32);
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(PREFIX);
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext == null || plaintext === "") {
      return plaintext ?? null;
    }
    if (this.isEncrypted(plaintext)) {
      return plaintext;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
  }

  decrypt(value: string | null | undefined): string | null {
    if (value == null || value === "") {
      return value ?? null;
    }
    if (!this.isEncrypted(value)) {
      return value;
    }

    const payload = value.slice(PREFIX.length);
    const [ivPart, tagPart, dataPart] = payload.split(":");
    if (!ivPart || !tagPart || !dataPart) {
      throw new Error("Stored credential is corrupted");
    }

    const iv = Buffer.from(ivPart, "base64url");
    const tag = Buffer.from(tagPart, "base64url");
    const data = Buffer.from(dataPart, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  }
}
