import { Injectable, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const org = await this.prisma.organization.create({
      data: { name: dto.organizationName },
    });
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        organizationId: org.id,
      },
    });
    await this.audit.log({
      organizationId: org.id,
      userId: user.id,
      action: AuditAction.LOGIN,
      metadata: { event: "register" },
    });
    return this.issueTokens(user.id, user.email, user.organizationId);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return null;
    }
    return { userId: user.id, email: user.email, organizationId: user.organizationId };
  }

  async login(user: { userId: string; email: string; organizationId: string }) {
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.LOGIN,
    });
    return this.issueTokens(user.userId, user.email, user.organizationId);
  }

  private issueTokens(userId: string, email: string, organizationId: string) {
    const payload = { sub: userId, email, organizationId };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: userId, email, organizationId },
    };
  }
}
