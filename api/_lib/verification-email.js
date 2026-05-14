/*
  Template HTML du mail de vérification d'adresse — design SoundCheck.
  ---------------------------------------------------------------------------
  Contraintes des clients mail (Gmail, Outlook, Apple Mail, etc.) :
   - Tout le CSS doit être INLINE (pas de <style>, ni de classes)
   - Pas de Flexbox/Grid : layout en <table> (oui, comme dans les années 2000)
   - Pas de polices web custom : on retombe sur Helvetica / Georgia
   - Pas de JS, pas d'images de fond (Outlook les strippe)
   - Largeur max 600px pour le rendu mobile

  On reprend le langage visuel de l'app : fond noir, italique serif pour les
  accents, accent vert SoundCheck pour le CTA, label en small caps tracked.

  La fonction renvoie un objet { subject, html, text } prêt à passer à Resend.
*/

/** Échappe les caractères qui pourraient casser le HTML (basique mais suffisant ici). */
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildVerificationEmail({ username, actionLink }) {
  const safeUsername = escapeHtml(username)
  const safeLink = escapeHtml(actionLink)
  const greeting = safeUsername
    ? `Salut <strong style="color:#FFFFFF;font-weight:600;">${safeUsername}</strong>,`
    : 'Salut,'

  const subject = 'Confirme ton adresse — SoundCheck'

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Confirme ton adresse — SoundCheck</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;color:#FFFFFF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Préheader (texte caché en haut de l'aperçu mail) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#0A0A0A;opacity:0;">
    Un clic et tu es prêt à jouer. Confirme ton adresse en quelques secondes.
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0A0A0A;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Container 560px max -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;">

          <!-- Label brand -->
          <tr>
            <td style="padding:0 0 36px 0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#6B6B6B;">
                SoundCheck &mdash;
                <span style="font-family:'Georgia','Times New Roman',serif;font-style:italic;text-transform:none;letter-spacing:normal;color:#B3B3B3;">le blind test</span>
              </p>
            </td>
          </tr>

          <!-- Titre -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <h1 style="margin:0;font-size:44px;font-weight:800;line-height:0.95;letter-spacing:-0.02em;color:#FFFFFF;">
                Confirme ton<br />
                <span style="font-family:'Georgia','Times New Roman',serif;font-style:italic;font-weight:400;font-size:38px;color:#1DB954;">adresse.</span>
              </h1>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#B3B3B3;">
                ${greeting}
              </p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:#B3B3B3;">
                Bienvenue sur SoundCheck. Pour finir ton inscription et commencer
                &agrave; grimper dans le classement, on a juste besoin de
                <span style="font-family:'Georgia','Times New Roman',serif;font-style:italic;color:#FFFFFF;">v&eacute;rifier ton adresse mail.</span>
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 0 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color:#1DB954;border-radius:999px;">
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;text-decoration:none;color:#0A0A0A;letter-spacing:0.02em;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                      V&eacute;rifier mon adresse &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Lien plain (fallback bouton qui marche pas) -->
          <tr>
            <td style="padding:0 0 36px 0;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#6B6B6B;">
                Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                   style="color:#A855F7;text-decoration:underline;">${safeLink}</a>
              </p>
            </td>
          </tr>

          <!-- Séparateur -->
          <tr>
            <td style="padding:0;">
              <div style="border-top:1px solid #232323;height:1px;font-size:1px;line-height:1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Note "tu n'as pas demandé ça" -->
          <tr>
            <td style="padding:32px 0 0 0;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#6B6B6B;">
                Tu n'as pas demand&eacute; cette inscription ? Tu peux ignorer ce
                message en toute s&eacute;curit&eacute;, aucun compte ne sera
                activ&eacute; sans ta confirmation.
              </p>
            </td>
          </tr>

          <!-- Footer brand -->
          <tr>
            <td style="padding:24px 0 0 0;">
              <p style="margin:0;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#6B6B6B;">
                SoundCheck &middot;
                <span style="font-family:'Georgia','Times New Roman',serif;font-style:italic;text-transform:none;letter-spacing:normal;">le blind test multijoueur</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // Version texte simple pour les clients mail qui n'affichent pas le HTML
  const text = `SoundCheck — Confirme ton adresse

${username ? 'Salut ' + username + ',' : 'Salut,'}

Bienvenue sur SoundCheck. Pour finir ton inscription, vérifie ton adresse
mail en ouvrant ce lien :

${actionLink}

Tu n'as pas demandé cette inscription ? Ignore simplement ce message.

— SoundCheck, le blind test multijoueur`

  return { subject, html, text }
}
