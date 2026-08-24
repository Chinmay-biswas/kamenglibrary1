import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
      profileComplete?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
    profileComplete?: boolean;
    name?: string | null;
    rollNo?: string;
    hostelRoomNo?: string;
    phoneNumber?: string;
  }
}
