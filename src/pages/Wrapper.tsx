import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import supabaseClient from "../services/supabaseClient";
import AchievementTriggers from "../components/AchievementTriggers";

interface WrapperProps {
  children: ReactNode;
}

const Wrapper = ({ children }: WrapperProps) => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
    });
  }, []);

  if (authenticated === null) {
    return (
      <div className="tw-scope flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return authenticated ? (
    <>
      {children}
      <AchievementTriggers />
    </>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default Wrapper;
