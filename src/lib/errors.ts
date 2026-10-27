import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

import { fa } from '@/i18n/fa';

import { UploadError } from './upload';

// whenue-api answers in English for developers; members see these messages instead.
const KNOWN: [RegExp, string][] = [
  [/code is wrong or has expired/i, fa.errors.wrongCode],
  [/code was just sent/i, fa.errors.codeTooSoon],
  [/too many codes/i, fa.errors.tooManyCodes],
  [/no clinic with this link/i, fa.errors.noClinic],
  [/not a valid mobile number/i, fa.errors.badMobile],
  [/no member with this referral code/i, fa.errors.badReferral],
  [/name is required|your name to join/i, fa.errors.nameRequired],
];

/** Whether the API refused because the person has not given a consent the step needs. */
export function isConsentRequired(error: unknown) {
  return CombinedGraphQLErrors.is(error) && error.errors.some((e) => e.message.includes('CONSENT_REQUIRED'));
}

/** Whether the member's sign-in is no longer accepted, so they need to sign in again. */
export function isSignedOut(error: unknown) {
  if (ServerError.is(error)) return error.statusCode === 401;
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((e) => ['UNAUTHENTICATED', 'PERMISSION_DENIED'].includes(String(e.extensions?.errorType)))
  );
}

/** A message for the member about what went wrong. */
export function errorMessage(error: unknown) {
  if (error instanceof UploadError) return fa.upload[error.reason];
  if (isSignedOut(error)) return fa.errors.expired;
  if (CombinedGraphQLErrors.is(error)) {
    for (const e of error.errors) {
      const known = KNOWN.find(([pattern]) => pattern.test(e.message));
      if (known) return known[1];
    }
    return fa.common.error;
  }
  return fa.common.offline;
}
