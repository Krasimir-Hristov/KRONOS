const SECRET_SUBSTRING_REGEX =
  /passwort|kennwort|geheimzahl|zugangscode|sicherheitscode|aktivierungscode|superpin|einmalpasswort|itan|phototan|pushtan|smstan|chiptan|password|passcode|api[\s_-]*key|private[\s_-]*key|secret[\s_-]*key|recovery[\s_-]*code|парола|таен\s*код|код\s*за\s*достъп|секретен\s*код|κωδικός\s*πρόσβασης|συνθηματικό/i;

const SECRET_TOKEN_REGEX =
  /(?:^|[^a-zA-Zа-яА-ЯёЁα-ωΑ-Ω])(pin|puk|tan|otp|пин)\d*(?:$|[^a-zA-Zа-яА-ЯёЁα-ωΑ-Ω0-9])/i;

const INLINE_SECRET_ASSIGNMENT_REGEX =
  /(\b(?:Passwort|Kennwort|Geheimzahl|Zugangscode|PIN(?:-Code)?|PUK|TAN|Password|Passcode|Парола|ПИН(?:\s*код)?)\s*[:=]\s*)([^\s,;\n]+)/gi;

export const isSuspectedSecretFact = (
  label: string,
  hint?: string | null
): boolean => {
  const combined = `${label} ${hint ?? ''}`.trim();
  if (!combined) {
    return false;
  }
  return SECRET_SUBSTRING_REGEX.test(combined) || SECRET_TOKEN_REGEX.test(combined);
};

export const redactSecretsFromFreeText = (
  text: string,
  droppedSecretValues: readonly string[] = []
): string => {
  if (!text) {
    return '';
  }

  let sanitized = text.replace(
    INLINE_SECRET_ASSIGNMENT_REGEX,
    '$1[СКРИТА ТАЙНА]'
  );

  for (const rawSecret of droppedSecretValues) {
    const trimmed = rawSecret.trim();
    if (trimmed.length >= 3) {
      sanitized = sanitized.split(trimmed).join('[СКРИТА ТАЙНА]');
    }
  }

  return sanitized;
};
