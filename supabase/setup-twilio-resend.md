# Activer l'OTP SMS et les e-mails — 10 minutes

Le code est prêt et déployé (dès que le repo est débloqué). Il ne manque que 2 comptes
gratuits et 4 clés à coller dans Vercel. Sans clé, tout fonctionne quand même en mode
dégradé (téléphone enregistré sans vérification, emails simplement sautés) — donc rien
n'est urgent, mais les deux prennent 5 min chacun.

## 1. Twilio Verify (OTP SMS)

1. Créer un compte sur [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (gratuit, crédit d'essai offert)
2. Dans la console : **Verify → Services → Create new Service**. Nom : `Borrow`
3. Récupérer 3 valeurs :
   - **Account SID** (page d'accueil de la console) → `TWILIO_ACCOUNT_SID`
   - **Auth Token** (page d'accueil, bouton "show") → `TWILIO_AUTH_TOKEN`
   - **Service SID** du service Verify créé à l'étape 2 (commence par `VA...`) → `TWILIO_VERIFY_SERVICE_SID`
4. En essai gratuit, Twilio n'envoie des SMS qu'aux numéros "vérifiés" dans la console
   (Phone Numbers → Verified Caller IDs) — ajoute ton numéro et celui d'Hannah pour tester,
   avant de passer sur un compte payant pour le vrai pilote.

## 2. Resend (e-mails transactionnels)

1. Créer un compte sur [resend.com](https://resend.com) (gratuit jusqu'à 3 000 e-mails/mois)
2. **API Keys → Create API Key** → `RESEND_API_KEY`
3. Sans domaine vérifié, les emails partent depuis `onboarding@resend.dev` (fonctionne,
   mais atterrit parfois en spam et n'inspire pas confiance). Pour un vrai lancement :
   **Domains → Add Domain**, ajouter les enregistrements DNS chez ton registrar, puis
   mettre `RESEND_FROM="Borrow <hello@tondomaine.com>"` dans Vercel.

## 3. Coller les clés dans Vercel

Vercel → projet `borrow` → Settings → Environment Variables → Add :
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` (type **Secret**)
- `RESEND_API_KEY` (type **Secret**), `RESEND_FROM` (type **Config**, optionnel)

Puis Redeploy. Envoie-moi les clés ici (ou dis-moi quand c'est fait) et je m'en charge
directement dans le navigateur si tu préfères.
