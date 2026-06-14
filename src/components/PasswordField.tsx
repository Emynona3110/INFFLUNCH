import {
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { VscEye, VscEyeClosed } from "react-icons/vsc";
import { useState } from "react";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isInvalid?: boolean;
}

/** Champ mot de passe avec bouton œil (masqué par défaut → œil barré). */
const PasswordField = ({
  label,
  value,
  onChange,
  isInvalid,
}: PasswordFieldProps) => {
  const [show, setShow] = useState(false);

  return (
    <FormControl isInvalid={isInvalid}>
      <FormLabel>{label}</FormLabel>
      <InputGroup onMouseLeave={() => setShow(false)}>
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <InputRightElement>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label={
              show ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            icon={show ? <VscEye /> : <VscEyeClosed />}
            onClick={() => setShow((prev) => !prev)}
          />
        </InputRightElement>
      </InputGroup>
    </FormControl>
  );
};

export default PasswordField;
