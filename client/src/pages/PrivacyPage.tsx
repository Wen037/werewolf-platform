export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
          Privacy Policy
        </h1>
        <p className="text-neutral-500 text-sm mb-10">Last updated: June 2026</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. Overview</h2>
          <p className="text-neutral-400 leading-relaxed">
            Werewolf SG ("we", "us", "our") operates the website at werewolf.sg. This page
            explains what personal information we collect, how we use it, and your rights
            regarding that information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
          <p className="text-neutral-400 leading-relaxed mb-3">
            When you sign in with Google, we receive the following information from Google:
          </p>
          <ul className="list-disc list-inside text-neutral-400 space-y-1 ml-2">
            <li>Your name (as set in your Google account)</li>
            <li>Your email address</li>
            <li>Your Google profile photo (optional)</li>
          </ul>
          <p className="text-neutral-400 leading-relaxed mt-3">
            When you register with email and password, we collect your chosen username, email
            address, and a securely hashed password (we never store your password in plain text).
          </p>
          <p className="text-neutral-400 leading-relaxed mt-3">
            We also collect activity data you voluntarily provide: game session history,
            event ratings, and profile information you choose to add (bio, contact number,
            skill level).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-neutral-400 space-y-2 ml-2">
            <li>To create and manage your Werewolf SG account</li>
            <li>To display your profile to other players on the platform</li>
            <li>To match you with game events and venues</li>
            <li>To send notifications about events you have joined or are hosting</li>
            <li>To maintain platform security and prevent abuse</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. Data Storage and Security</h2>
          <p className="text-neutral-400 leading-relaxed">
            Your data is stored on servers hosted in Singapore. We use industry-standard
            security measures including HTTPS encryption, hashed passwords, and JWT-based
            authentication. We do not sell your personal data to third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Third-Party Services</h2>
          <p className="text-neutral-400 leading-relaxed">
            We use Google OAuth for sign-in (subject to{" "}
            <a href="https://policies.google.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noreferrer">
              Google's Privacy Policy
            </a>
            ) and Cloudinary for image hosting. We do not share your data with any other
            third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
          <p className="text-neutral-400 leading-relaxed">
            You may request deletion of your account and associated data at any time by
            contacting us. You may also edit or remove your profile information through the
            My Profile page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">7. Contact</h2>
          <p className="text-neutral-400 leading-relaxed">
            For any privacy-related questions, please contact us at{" "}
            <a href="mailto:becky.fuwen@gmail.com" className="text-blue-400 hover:underline">
              becky.fuwen@gmail.com
            </a>
            .
          </p>
        </section>

        <div className="border-t border-neutral-800 pt-8 mt-8">
          <a href="/" className="text-neutral-500 hover:text-white text-sm transition-colors">
            ← Back to Werewolf SG
          </a>
        </div>
      </div>
    </div>
  );
}
