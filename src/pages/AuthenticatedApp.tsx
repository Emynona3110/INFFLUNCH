import ForcePasswordChangeGate from "../components/ForcePasswordChangeGate";
import Wrapper from "./Wrapper";
import UserPage from "./UserPage";

/**
 * Application réservée aux connectés, dans son propre chunk (chargé par
 * App.tsx via `lazy`) : la page de connexion ne télécharge pas tout le site.
 */
const AuthenticatedApp = () => (
  <ForcePasswordChangeGate>
    <Wrapper>
      <UserPage />
    </Wrapper>
  </ForcePasswordChangeGate>
);

export default AuthenticatedApp;
