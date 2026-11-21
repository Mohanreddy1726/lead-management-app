// app/api/user/role/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

const VALID_ROLES = ["admin", "manager", "telecaller"];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await request.json();
    if (!role || !VALID_ROLES.includes(role.toLowerCase())) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    await dbConnect();
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email.toLowerCase() },
      { role: role.toLowerCase(), roleSelected: true },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      role: updatedUser.role,
      roleSelected: updatedUser.roleSelected,
    });
  } catch (error: any) {
    console.error("Error setting role:", error);
    return NextResponse.json({ error: "Failed to update role." }, { status: 500 });
  }
}
