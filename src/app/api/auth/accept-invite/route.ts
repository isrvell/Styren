import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const membership = await db.organizationMembership.findUnique({
      where: { inviteToken: token },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 404 }
      );
    }

    if (membership.status === "ACTIVE") {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.$transaction([
      db.user.update({
        where: { id: membership.userId },
        data: {
          name: name || membership.user.name,
          passwordHash,
        },
      }),
      db.organizationMembership.update({
        where: { id: membership.id },
        data: {
          status: "ACTIVE",
          joinedAt: new Date(),
          inviteToken: null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      email: membership.user.email,
      orgSlug: membership.organization.slug,
    });
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
