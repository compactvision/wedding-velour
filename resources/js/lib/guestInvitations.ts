type WeddingInvitation = {
  title?: string;
  date?: string | null;
  venue?: string | null;
};

type GuestInvitation = {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  invitation_link?: string | null;
};

function getBrowserOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function buildInvitationUrl(token?: string | null, origin = getBrowserOrigin()) {
  return `${origin}/invitation?invite=${encodeURIComponent(token || '')}`;
}

export function normalizeWhatsappPhone(phone?: string | null, defaultCountryCode = '243') {
  const raw = (phone || '').trim();

  if (!raw) {
    return '';
  }

  let digits = raw.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    return digits.replace(/\D/g, '');
  }

  digits = digits.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    return digits.slice(2);
  }

  if (digits.startsWith(defaultCountryCode)) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  return digits;
}

export function buildWhatsappInvitationText(guest: GuestInvitation, wedding: WeddingInvitation, inviteUrl: string) {
  const eventDate = wedding.date
    ? new Date(wedding.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return [
    `✨ *${wedding.title || 'Invitation'}* ✨`,
    '',
    `Cher(e) ${guest.first_name || ''},`,
    '',
    'Nous avons le plaisir de vous inviter à notre mariage ! 💍',
    '',
    eventDate ? `📅 ${eventDate}` : '',
    wedding.venue ? `📍 ${wedding.venue}` : '',
    '',
    '👉 Confirmez votre présence ici :',
    inviteUrl,
  ].filter(line => line !== '').join('\n');
}

export function buildWhatsappInvitationLink(guest: GuestInvitation, wedding: WeddingInvitation, origin = getBrowserOrigin()) {
  const phone = normalizeWhatsappPhone(guest.phone);

  if (!phone || !guest.invitation_link) {
    return '';
  }

  const inviteUrl = buildInvitationUrl(guest.invitation_link, origin);
  const text = buildWhatsappInvitationText(guest, wedding, inviteUrl);

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
