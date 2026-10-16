import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

export interface AuthProfile {
  id: string;
  username: string;
  created_at: string;
}

export interface AuthController {
  session: Session | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<boolean>;
  signUp: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  clearError: () => void;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error(
      "L’identifiant doit contenir de 3 à 32 caractères : lettres, chiffres, point, tiret ou tiret bas.",
    );
  }

  return normalized;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Une erreur inattendue est survenue pendant l’authentification.";
}

export function useAuth(client: SupabaseClient): AuthController {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileRequestId = useRef(0);

  const loadProfile = useCallback(
    async (userId: string): Promise<AuthProfile> => {
      const requestId = ++profileRequestId.current;
      const { data, error: profileError } = await client
        .from("profiles")
        .select("id, username, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        throw new Error("Aucun profil n’est associé à ce compte.");
      }

      const loadedProfile: AuthProfile = {
        id: data.id,
        username: data.username,
        created_at: data.created_at,
      };
      if (requestId === profileRequestId.current) {
        setProfile(loadedProfile);
      }

      return loadedProfile;
    },
    [client],
  );

  useEffect(() => {
    let isMounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setProfile(null);

      if (!nextSession) {
        profileRequestId.current += 1;
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        await loadProfile(nextSession.user.id);
        if (isMounted) {
          setError(null);
        }
      } catch (profileError) {
        if (isMounted) {
          setError(getErrorMessage(profileError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        void applySession(nextSession);
      }, 0);
    });

    void client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isMounted) {
          return;
        }
        if (sessionError) {
          setError(sessionError.message);
          setIsLoading(false);
          return;
        }
        void applySession(data.session);
      })
      .catch((sessionError: unknown) => {
        if (isMounted) {
          setError(getErrorMessage(sessionError));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      profileRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, [client, loadProfile]);

  const runAction = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        await action();
        return true;
      } catch (actionError) {
        setError(getErrorMessage(actionError));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const signIn = useCallback(
    (username: string, password: string) =>
      runAction(async () => {
        const email = `${normalizeUsername(username)}@runplanner.com`;
        const { data, error: signInError } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }
        if (!data.session) {
          throw new Error("La connexion n’a pas créé de session active.");
        }

        setSession(data.session);
        await loadProfile(data.user.id);
      }),
    [client, loadProfile, runAction],
  );

  const signUp = useCallback(
    (username: string, password: string) =>
      runAction(async () => {
        const normalizedUsername = normalizeUsername(username);
        const email = `${normalizedUsername}@runplanner.com`;
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }
        if (!data.user) {
          throw new Error("Supabase Auth n’a renvoyé aucun utilisateur après l’inscription.");
        }

        const { data: createdProfile, error: profileError } = await client
          .from("profiles")
          .insert({ id: data.user.id, username: normalizedUsername })
          .select("id, username, created_at")
          .single();

        if (profileError) {
          throw new Error(
            `Le compte a été créé, mais son profil n’a pas pu être enregistré : ${profileError.message}`,
          );
        }
        if (!data.session) {
          throw new Error(
            "Le profil a été créé, mais aucune session active n’a été ouverte. Vérifiez la configuration de confirmation des comptes.",
          );
        }

        profileRequestId.current += 1;
        setSession(data.session);
        setError(null);
        setProfile({
          id: createdProfile.id,
          username: createdProfile.username,
          created_at: createdProfile.created_at,
        });
      }),
    [client, runAction],
  );

  const signOut = useCallback(
    () =>
      runAction(async () => {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) {
          throw signOutError;
        }

        profileRequestId.current += 1;
        setSession(null);
        setProfile(null);
      }),
    [client, runAction],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    profile,
    isLoading,
    isSubmitting,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}
