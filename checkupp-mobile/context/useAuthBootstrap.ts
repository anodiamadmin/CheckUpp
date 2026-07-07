import {
  getCurrentUserProfile,
} from "@/lib/auth/api";
import {
  clearAuthSession,
  hydrateStoredAuthSession,
} from "@/lib/auth/session";
import { useAppStore } from "@/lib/state/appStore";
import { useEffect } from "react";

export const useGlobalContext = () => useAppStore();

export const useAuthBootstrap = () => {
  const setLoading = useAppStore((state) => state.setLoading);
  const setProfileResolved = useAppStore((state) => state.setProfileResolved);
  const resetAuthState = useAppStore((state) => state.resetAuthState);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setLoading(true);

      try {
        const session = await hydrateStoredAuthSession();

        if (!session?.refreshToken && !session?.accessToken) {
          if (isMounted) resetAuthState();
          return;
        }

        if (isMounted) {
          // Wait for /me/profile before using authenticated routing decisions.
          setProfileResolved(false);
        }

        const currentUser = await getCurrentUserProfile();

        if (!isMounted) return;

        if (!currentUser) {
          await clearAuthSession();
        }
      } catch (error) {
        console.error("Error bootstrapping auth session:", error);
        await clearAuthSession();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    setLoading,
    setProfileResolved,
    resetAuthState,
  ]);
};
