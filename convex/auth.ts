import { convexAuth } from "@convex-dev/auth/server";
import { AdminPassword } from "./passwordProvider";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [AdminPassword],
});
