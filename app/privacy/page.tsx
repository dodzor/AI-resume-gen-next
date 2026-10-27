import type { Metadata } from 'next'
import { legal } from '@/config/legal'
import { LegalBackLink, LegalContact, LegalPage, LegalSection } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: `Privacy policy · ${legal.productName}`,
  description: `What ${legal.productName} collects, which providers receive it, and how to ask for it.`,
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <LegalSection heading="Who this notice covers">
        <p>
          {legal.productName} is a website that helps you compare a resume with a job description,
          save a career record, and draft resume text. This notice describes what the site
          actually collects today. It is written for visitors in the European Economic Area
          and the United Kingdom, and it applies to every visitor.
        </p>
        <p>
          The controller is the person or company that decides why this data is used.
          That identity is published in the contact section below.
        </p>
      </LegalSection>

      <LegalSection heading="Data you give us">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-slate-900">Account.</span> When you sign up,
            Clerk collects the email address and name you enter, and assigns a user id.
            We store that user id with your plan and usage. We do not receive your password.
          </li>
          <li>
            <span className="font-medium text-slate-900">Resume and job text.</span> Saved
            resumes can include your name, email, phone, location, employers, dates,
            education, certifications, skills, portfolio links, a job description, clarifying
            answers, and the generated draft. This is stored in Convex, tied to your Clerk user id.
          </li>
          <li>
            <span className="font-medium text-slate-900">Free scanner.</span> You can upload
            a PDF resume and paste a job description without an account. Our server extracts
            the text and scores it on the server. That upload is not written to the resume
            database and is not sent to OpenAI. The file still passes through our host for
            that request.
          </li>
          <li>
            <span className="font-medium text-slate-900">Payment.</span> Paid plans are sold
            through Clerk Billing. Clerk uses Stripe to collect the card and billing details.
            We store the plan name (free, pro, or enterprise) and usage counts. We do not
            receive or store the card number.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Data collected when you use the site">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-slate-900">Clerk session cookie.</span> Clerk
            sets a cookie so a signed-in session continues and so sign-in can be checked
            for abuse. This is on because the product has accounts. Rejecting analytics
            does not turn it off. If you do not sign in, you can still open the public pages
            and the free scanner.
          </li>
          <li>
            <span className="font-medium text-slate-900">Hosting logs.</span> Vercel, which
            hosts the site, records the usual request data: IP address, user agent, URL,
            and time. Those logs are for security and debugging.
          </li>
          <li>
            <span className="font-medium text-slate-900">Usage counts.</span> For a signed-in
            account we count job analyses, AI rewrites, PDF exports, and resumes created,
            plus the billing-period dates, so plan limits can be applied.
          </li>
          <li>
            <span className="font-medium text-slate-900">Optional measurement.</span> Vercel
            Web Analytics loads only after you press Accept analytics. Vercel describes this
            product as cookieless. It receives the page path, referrer, browser, operating
            system, device type, and a country derived from the IP address. We do not use
            it to build an advertising profile.
          </li>
        </ul>
        <p>
          We do not run session replay. We do not use Hotjar, FullStory, PostHog, Google
          Analytics, Meta Pixel, or an email-marketing tool. Fonts are served from this
          site, not from Google Fonts. There is no separate email product such as Resend
          or SendGrid. Clerk sends its own messages for sign-in and account security.
        </p>
      </LegalSection>

      <LegalSection heading="Who receives personal data">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-slate-900">
                <th className="py-2 pr-3 font-semibold">Provider</th>
                <th className="py-2 pr-3 font-semibold">Role</th>
                <th className="py-2 font-semibold">What they get</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-slate-200">
                <td className="py-3 pr-3 font-medium text-slate-900">Clerk</td>
                <td className="py-3 pr-3">Accounts and billing</td>
                <td className="py-3">
                  Email, name, user id, session cookie, sign-in security data, and the
                  subscription status. Billing details go through Clerk to Stripe.
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 pr-3 font-medium text-slate-900">Stripe</td>
                <td className="py-3 pr-3">Card payments, via Clerk</td>
                <td className="py-3">
                  Payment card and billing details for a paid plan. We do not see the full card number.
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 pr-3 font-medium text-slate-900">Convex</td>
                <td className="py-3 pr-3">Database</td>
                <td className="py-3">
                  Saved resumes, clarifying answers, generated drafts, the Clerk user id,
                  plan, and usage counts.
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 pr-3 font-medium text-slate-900">OpenAI</td>
                <td className="py-3 pr-3">Drafting and analysis</td>
                <td className="py-3">
                  For signed-in AI actions, the resume text, job description, and answers
                  you submit are sent to OpenAI to produce the rewrite, summary, tailoring,
                  structure, interview prompts, or review you asked for. The free scanner
                  does not call OpenAI.
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 pr-3 font-medium text-slate-900">Vercel</td>
                <td className="py-3 pr-3">Hosting and optional analytics</td>
                <td className="py-3">
                  Request logs, including IP address. PDF uploads for the free scanner
                  and PDF export are processed on this host. Page measurement only if you accept.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-3 font-medium text-slate-900">Greenhouse</td>
                <td className="py-3 pr-3">Source of public job posts</td>
                <td className="py-3">
                  We copy public job posts from Greenhouse boards into our own database.
                  Your resume, account, and search is not sent to Greenhouse.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          OpenAI&apos;s API terms say that content sent through the API is not used to train
          their models by default. That is OpenAI&apos;s rule. Do not submit a resume or a
          job description you are not willing to send to a provider in the United States.
        </p>
        <p>
          Clerk webhooks tell our server when an account or subscription changes. We check
          the signature on our server. The webhook body is the account and plan event, not
          a copy of the resume.
        </p>
      </LegalSection>

      <LegalSection heading="Why we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-slate-900">Contract.</span> To create your
            account, store resumes, run the AI action you request, export a PDF, and
            apply the plan you bought.
          </li>
          <li>
            <span className="font-medium text-slate-900">Consent.</span> Vercel Web Analytics
            runs only after you accept. You can reject it, and you can change that choice
            from Cookie settings in the footer. Withdrawing consent does not affect AI
            processing you already asked for.
          </li>
          <li>
            <span className="font-medium text-slate-900">Legitimate interests.</span> To
            keep accounts secure, debug failures, and enforce usage limits. The Clerk
            cookie and hosting logs fall here. You can object where the law gives you that right.
          </li>
          <li>
            <span className="font-medium text-slate-900">Legal obligation.</span> Payment
            providers keep billing records they are required to keep. We do not keep a
            separate copy of your card.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Cookies and similar storage">
        <p>
          The banner is shown to every visitor. We do not detect your country, because
          that would mean sending your IP address to another location service.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-slate-900">Required.</span> Clerk&apos;s session
            cookie, used to recognize a signed-in browser. The site does not offer a
            switch for this cookie. Avoid it by not signing in.
          </li>
          <li>
            <span className="font-medium text-slate-900">Required for your choice.</span> Your
            accept or reject decision is stored in this browser under the key{' '}
            <span className="font-mono">rolemirror-analytics-consent</span>. That entry
            exists so we can honor the choice. It does not go to an ad network.
          </li>
          <li>
            <span className="font-medium text-slate-900">Optional.</span> The Vercel analytics
            script, loaded only after Accept analytics.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <ul className="list-disc space-y-2 pl-5">
          <li>A saved resume stays until you delete that resume in the product, or until the account is deleted.</li>
          <li>Usage counts and the plan stay for the life of the account.</li>
          <li>A free-scanner PDF is handled for that request and is not saved as a resume.</li>
          <li>Hosting logs follow the retention on our Vercel account.</li>
          <li>Analytics events, if you accepted, follow Vercel&apos;s retention for Web Analytics.</li>
          <li>Clerk and Stripe keep account and payment records under their own schedules and legal duties.</li>
        </ul>
        <p>
          The product has a delete action for a saved resume. It does not have a separate
          automated purge of old accounts. To delete the account itself, use the contact
          address below once it is published, and also delete the user in Clerk if the
          account screen offers that.
        </p>
      </LegalSection>

      <LegalSection heading="Transfers out of the UK and EEA">
        <p>
          Clerk, Stripe, Convex, OpenAI, and Vercel process data in the United States.
          Where a transfer needs a safeguard, it has to be the mechanism that provider
          offers in its data-processing terms, such as standard contractual clauses.
          Those contracts have to be in place between the operator and each provider.
          This software repository does not, by itself, sign them.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          If you are in the EEA, the UK, or Switzerland, you can ask to access, correct,
          delete, or restrict your personal data, and you can ask for a copy of the resume
          data you provided. You can object to processing based on legitimate interests.
          You can withdraw analytics consent at any time from Cookie settings. You can
          lodge a complaint with your local data-protection authority. In the UK, that is
          the Information Commissioner&apos;s Office. These rights are not a promise that every
          request will be granted in full. Some records, especially payment records held
          by Stripe, may have to be kept.
        </p>
        <p>
          Send requests to the privacy address below. We need a way to confirm the request
          is yours, which will usually be the email on the account.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          {legal.productName} is not for anyone under 16. We do not knowingly create
          accounts for children.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If we add a tool that collects personal data, this page should name it before
          that tool is turned on for visitors. The date at the top is the date of this draft.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <LegalContact />
        <LegalBackLink />
      </LegalSection>
    </LegalPage>
  )
}
