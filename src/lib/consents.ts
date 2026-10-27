import type { ConsentInput, ConsentPurpose } from '@/graphql/operations';

/**
 * Version of the wording below. Raise it whenever the wording changes, so each recorded
 * consent still says which wording the person agreed to. Draft wording: to be checked by a
 * lawyer, like the panel's paper form (paper-fa-v1), which says the same.
 */
export const APP_CONSENT_VERSION = 'app-fa-v1';

/** The wording shown in the app for each purpose, stored with every answer. */
export function consentText(purpose: ConsentPurpose, clinic: string) {
  switch (purpose) {
    case 'CLUB_MEMBERSHIP':
      return `با عضویت در باشگاه مشتریان ${clinic} موافقم. نام و شماره موبایل من و سوابق امتیازهایم برای اداره باشگاه نگهداری می‌شود و هر زمان می‌توانم از باشگاه خارج شوم.`;
    case 'MARKETING_SMS':
      return `موافقم ${clinic} پیشنهادها و خبرهای باشگاه را با پیامک برایم بفرستد. هر زمان می‌توانم این موافقت را پس بگیرم.`;
    case 'TESTIMONIAL_RECORDING':
      return `موافقم ویدیویی از تجربه‌ام در ${clinic} ضبط و برای بررسی کلینیک نگهداری شود. با پس گرفتن این موافقت، ویدیو پاک می‌شود.`;
    case 'PUBLISH_IN_CLINIC':
      return `موافقم ویدیوی تجربه‌ام در محل ${clinic} نمایش داده شود.`;
    case 'PUBLISH_ON_WEBSITE':
      return `موافقم ویدیوی تجربه‌ام در وب‌سایت ${clinic} نمایش داده شود.`;
    case 'PUBLISH_ON_SOCIAL_MEDIA':
      return `موافقم ویدیوی تجربه‌ام در شبکه‌های اجتماعی ${clinic} منتشر شود.`;
  }
}

export function consentAnswer(purpose: ConsentPurpose, granted: boolean, clinic: string): ConsentInput {
  return { purpose, granted, textVersion: APP_CONSENT_VERSION, text: consentText(purpose, clinic) };
}

/** Where a testimonial may be shown; each is asked separately and none is needed. */
export const PUBLISH_PURPOSES: ConsentPurpose[] = ['PUBLISH_IN_CLINIC', 'PUBLISH_ON_WEBSITE', 'PUBLISH_ON_SOCIAL_MEDIA'];
