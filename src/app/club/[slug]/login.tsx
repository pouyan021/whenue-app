import { useMutation, useQuery } from '@apollo/client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Checkbox, ErrorText, Field, Loading, ScrollScreen, typography } from '@/components/ui';
import { CLUB, REQUEST_MEMBER_LOGIN_CODE, VERIFY_MEMBER_LOGIN_CODE } from '@/graphql/operations';
import { fa } from '@/i18n/fa';
import { normalizeReferralCode } from '@/lib/clubLink';
import { consentAnswer, consentText } from '@/lib/consents';
import { errorMessage, isConsentRequired } from '@/lib/errors';
import { toLatinDigits, toPersianDigits } from '@/lib/numbers';
import { useSessions } from '@/lib/sessions';

type Step = 'mobile' | 'code' | 'join';

/**
 * Sign-in with a code texted to the member's mobile. Someone who is not a member yet is
 * asked for their name and consent after the code, and joins with the same code.
 */
export default function LoginScreen() {
  const { slug, ref } = useLocalSearchParams<{ slug: string; ref?: string }>();
  const { signIn } = useSessions();
  const club = useQuery(CLUB, { variables: { slug } });
  const [requestCode, requesting] = useMutation(REQUEST_MEMBER_LOGIN_CODE);
  const [verifyCode, verifying] = useMutation(VERIFY_MEMBER_LOGIN_CODE);
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState(ref ?? '');
  const [agreed, setAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (club.loading) return <Loading />;
  const clinic = club.data?.club;
  if (!clinic) {
    return (
      <ScrollScreen>
        <ErrorText>{club.error ? errorMessage(club.error) : fa.errors.noClinic}</ErrorText>
        {club.error ? <Button title={fa.common.retry} onPress={() => club.refetch()} /> : null}
      </ScrollScreen>
    );
  }

  async function sendCode() {
    setError(null);
    try {
      await requestCode({ variables: { organizationSlug: slug, mobile: toLatinDigits(mobile.trim()) } });
      setCode('');
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function verify() {
    setError(null);
    const joining = step === 'join';
    if (joining && !agreed) {
      setError(fa.login.mustAgree);
      return;
    }
    try {
      const { data } = await verifyCode({
        variables: {
          input: {
            organizationSlug: slug,
            mobile: toLatinDigits(mobile.trim()),
            code: toLatinDigits(code.trim()),
            ...(joining && {
              name: name.trim(),
              consents: [
                consentAnswer('CLUB_MEMBERSHIP', true, clinic!.name),
                consentAnswer('MARKETING_SMS', marketing, clinic!.name),
              ],
              referralCode: clinic!.referralsEnabled ? normalizeReferralCode(referralCode) : null,
            }),
          },
        },
      });
      const signedIn = data!.verifyMemberLoginCode;
      await signIn({
        slug,
        clinic: signedIn.member.organization.name,
        memberId: signedIn.member.id,
        token: signedIn.token,
        expiresAt: signedIn.expiresAt,
      });
      router.replace({ pathname: '/club/[slug]', params: { slug } });
    } catch (e) {
      if (!joining && isConsentRequired(e)) {
        setStep('join');
      } else {
        setError(errorMessage(e));
      }
    }
  }

  return (
    <ScrollScreen>
      <Text style={typography.title}>{clinic.name}</Text>

      {step === 'mobile' && (
        <>
          <Field
            label={fa.login.mobile}
            hint={fa.login.mobileHint}
            autoComplete="tel"
            keyboardType="phone-pad"
            placeholder="09xx xxx xxxx"
            textContentType="telephoneNumber"
            value={mobile}
            onChangeText={setMobile}
            onSubmitEditing={sendCode}
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Button title={fa.login.sendCode} disabled={!mobile.trim()} loading={requesting.loading} onPress={sendCode} />
        </>
      )}

      {step !== 'mobile' && (
        <>
          <Text style={typography.body}>{fa.login.codeSentTo(toPersianDigits(toLatinDigits(mobile.trim())))}</Text>
          <Field
            label={fa.login.code}
            autoComplete="sms-otp"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            value={code}
            onChangeText={setCode}
            onSubmitEditing={step === 'code' ? verify : undefined}
          />
        </>
      )}

      {step === 'join' && (
        <Card>
          <Text style={typography.heading}>{fa.login.joinTitle}</Text>
          <Text style={typography.body}>{fa.login.joinBody}</Text>
          <Field label={fa.login.name} autoComplete="name" value={name} onChangeText={setName} />
          {clinic.referralsEnabled && (
            <Field
              label={fa.login.referralCode}
              hint={fa.login.referralHint}
              autoCapitalize="characters"
              autoCorrect={false}
              value={referralCode}
              onChangeText={setReferralCode}
            />
          )}
          <Checkbox label={fa.consent.agree} checked={agreed} onChange={setAgreed}>
            <Text style={typography.muted}>{consentText('CLUB_MEMBERSHIP', clinic.name)}</Text>
          </Checkbox>
          <Checkbox label={fa.login.marketing} checked={marketing} onChange={setMarketing}>
            <Text style={typography.muted}>{consentText('MARKETING_SMS', clinic.name)}</Text>
          </Checkbox>
        </Card>
      )}

      {step !== 'mobile' && (
        <>
          {error && <ErrorText>{error}</ErrorText>}
          <Button
            title={step === 'join' ? fa.login.join : fa.login.verify}
            disabled={!code.trim() || (step === 'join' && !name.trim())}
            loading={verifying.loading}
            onPress={verify}
          />
          <Button title={fa.login.resend} variant="secondary" disabled={requesting.loading} onPress={sendCode} />
          <Button
            title={fa.login.changeMobile}
            variant="secondary"
            onPress={() => {
              setError(null);
              setStep('mobile');
            }}
          />
        </>
      )}
    </ScrollScreen>
  );
}
