import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured — email not sent:', subject);
    return { success: false, error: 'Email not configured (RESEND_API_KEY missing)' };
  }

  try {
    const { error } = await resend.emails.send({
      from: 'TripSync <notifications@tripsync.piyushfunde.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Send email error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Build the trip summary email HTML
export function buildNudgeEmailHtml({
  memberName,
  tripName,
  tripUrl,
  members,
  pendingActions,
  decisions,
}: {
  memberName: string;
  tripName: string;
  tripUrl: string;
  members: { name: string; rsvpStatus: string }[];
  pendingActions: string[];
  decisions: { title: string; status: string; value?: string }[];
}): string {
  const rsvpList = members
    .map((m) => {
      const statusEmoji = m.rsvpStatus === 'in' ? '✅' : m.rsvpStatus === 'out' ? '❌' : m.rsvpStatus === 'maybe' ? '🤔' : '⏳';
      return `<li>${statusEmoji} ${m.name}: ${m.rsvpStatus.charAt(0).toUpperCase() + m.rsvpStatus.slice(1)}</li>`;
    })
    .join('\n');

  const actionsList = pendingActions.length > 0
    ? pendingActions.map((a) => `<li>→ ${a}</li>`).join('\n')
    : '<li>No pending actions 🎉</li>';

  const decisionsList = decisions.length > 0
    ? decisions.map((d) => `<li>${d.title}: ${d.status}${d.value ? ` — ${d.value}` : ''}</li>`).join('\n')
    : '<li>No decisions yet</li>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { background: linear-gradient(135deg, #2563EB, #1E40AF); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
    .section { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .section h2 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .section ul { margin: 0; padding-left: 20px; }
    .section li { margin-bottom: 4px; font-size: 14px; }
    .actions { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .actions h2 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #92400E; }
    .cta { display: inline-block; background: #2563EB; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tripName}</h1>
    <p>Trip Update for ${memberName}</p>
  </div>

  <p style="font-size: 14px;">Hi ${memberName},</p>
  <p style="font-size: 14px;">Here's the current status of <strong>${tripName}</strong>:</p>

  <div class="section">
    <h2>Who's In</h2>
    <ul>${rsvpList}</ul>
  </div>

  <div class="actions">
    <h2>⚡ What Needs Your Input</h2>
    <ul>${actionsList}</ul>
  </div>

  <div class="section">
    <h2>Decisions Made</h2>
    <ul>${decisionsList}</ul>
  </div>

  <p style="text-align: center;">
    <a href="${tripUrl}" class="cta">Open Trip Dashboard →</a>
  </p>

  <div class="footer">
    <p>Sent by TripSync · <a href="${tripUrl}" style="color: #6B7280;">View trip</a></p>
  </div>
</body>
</html>`;
}
