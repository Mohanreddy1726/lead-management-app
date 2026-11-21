import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: true });
    }

    const emailTrimmed = email.toLowerCase().trim();
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    // Master admin from .env.local has unrestricted role access
    if (adminEmail && emailTrimmed === adminEmail) {
      return NextResponse.json({ ok: true });
    }

    await dbConnect();
    const user = await User.findOne({ email: emailTrimmed }).select("role");
    if (!user) {
      // If user does not exist, let signIn fail naturally with "Invalid email or password"
      return NextResponse.json({ ok: true });
    }

    const actualRole = (user.role || "telecaller").toLowerCase();
    const requestedRole = (role || actualRole).toLowerCase();

    // Lower roles cannot escalate to higher roles
    if (actualRole === "telecaller" && (requestedRole === "manager" || requestedRole === "admin")) {
      return NextResponse.json({
        ok: false,
        warning: `Access Denied: Your account is registered as a Telecaller. You cannot log in as ${
          requestedRole === "admin" ? "Admin" : "Manager"
        }. Please select 'Telecaller' to sign in.`,
      });
    }

    if (actualRole === "manager" && requestedRole === "admin") {
      return NextResponse.json({
        ok: false,
        warning:
          "Access Denied: Your account is registered as a Manager. You cannot log in as Admin. Please select 'Manager' to sign in.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // If error in check, fall through to credentials auth
    return NextResponse.json({ ok: true });
  }
}
