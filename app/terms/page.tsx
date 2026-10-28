import type { Metadata } from 'next'
import { legal } from '@/config/legal'
import { LegalBackLink, LegalContact, LegalPage, LegalSection } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: `Terms of service · ${legal.productName}`,
  description: `The rules for using ${legal.productName}, including the limit on liability.`,
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <LegalSection heading="Agreement">
        <p>
          These terms are between you and the operator named in the contact section,
          for your use of {legal.productName}.
        </p>
        <p>
          By creating an account, uploading a resume, or paying for a plan, you agree
          to these terms. If you use the site for a company, you confirm you can bind that company.
        </p>
      </LegalSection>

      <LegalSection heading="The service">
        <p>
          {legal.productName} shows how a resume lines up with a job description and can
          draft resume text from material you supply. Job listings in Discover are copies
          of public posts. We do not employ you, represent the hiring company, or submit
          applications for you.
        </p>
        <p>
          Generated text can be wrong, generic, or inconsistent with your real history.
          You are responsible for reading every line before you send it to an employer.
          You must not leave invented employers, titles, dates, or metrics in a resume
          you submit. We do not check that your career history is true.
        </p>
        <p>
          We do not promise interviews, offers, a particular match score, or that a
          resume will pass an employer&apos;s screen or an automated filter.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts and age">
        <p>
          Saved resumes and the AI drafting tools require an account. You are responsible
          for activity under your login. You must be at least 16 years old.
        </p>
      </LegalSection>

      <LegalSection heading="Your content">
        <p>
          You keep ownership of the resume text, job descriptions, and other material you
          submit. You give the operator a license to host that material, display it back
          to you, and send it to the processors named in the privacy policy only so we
          can provide the feature you used.
        </p>
        <p>
          You confirm you have the right to submit that material. Do not upload a resume
          or personal data that belongs to someone else unless you are allowed to.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>You will not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>break the law, or infringe someone else&apos;s privacy or intellectual property, with the service</li>
          <li>probe, scan, or overload the service, or try to access another person&apos;s account or our provider credentials</li>
          <li>resell the service or present the output as a background check or a verified employment record</li>
          <li>send the output to an employer while knowing a material claim in it is false</li>
        </ul>
        <p>
          We may suspend or close an account that breaks these terms. If we do, you can
          ask us to review that decision using the legal contact below.
        </p>
      </LegalSection>

      <LegalSection heading="Plans and fees">
        <p>
          The free plan includes the public scanner and one tailored resume with PDF
          export. This search is a one-time fee for 30 days and up to 8 tailored
          resumes, and it does not renew. Still looking is a monthly fee for the same
          access and renews until you cancel. Prices are shown on the pricing page
          before you pay. Clerk bills paid plans and Stripe processes the card. We can
          change prices or plan limits for a future billing period. Taxes may be added
          where the law requires. Unless a mandatory consumer right says otherwise, fees
          already charged are not refunded because you did not get an interview.
        </p>
      </LegalSection>

      <LegalSection heading="Availability and changes">
        <p>
          The service is provided as available. Features can change, break, or be removed.
          AI providers can refuse or delay a request. We are not liable for a job posting
          that is out of date, filled, or inaccurate at the source.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimer">
        <p>
          To the extent the law allows, the service and all generated text are provided
          &quot;as is&quot; and &quot;as available&quot;, without warranties of merchantability, fitness for
          a particular purpose, quiet enjoyment, or non-infringement, and without a
          warranty that the service will be uninterrupted or error-free.
        </p>
        <p>
          Nothing on the site is legal advice, immigration advice, or a promise about
          hiring outcomes.
        </p>
      </LegalSection>

      <LegalSection heading="Limit on liability">
        <p>To the extent the law allows:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            We are not liable for indirect, incidental, special, consequential, exemplary,
            or punitive damages, or for lost profits, lost data, lost goodwill, or lost
            employment opportunities, even if we were told those losses were possible.
          </li>
          <li>
            Our total liability for all claims arising out of the service in a 12-month
            period is limited to the greater of the fees you paid us for the service in
            those 12 months and 100 euros.
          </li>
        </ul>
        <p>
          These limits do not apply to liability that a court will not let us limit.
          That includes liability for fraud or fraudulent misrepresentation, for death
          or personal injury caused by negligence, and any non-waivable consumer right
          in the EEA or the UK. If you are a consumer there, mandatory local law still
          protects you, including rights against a digital service that is not as described.
        </p>
      </LegalSection>

      <LegalSection heading="Claims from your content">
        <p>
          If a third party claims that material you submitted, or the way you used the
          output, infringes their rights or breaks the law, you will cover the resulting
          damages and reasonable legal costs we incur, except to the extent the claim
          is caused by our breach of these terms. If you are a consumer, this section
          applies only where a local law allows a term of this kind.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          {legal.governingLaw
            ? `These terms are governed by the laws of ${legal.governingLaw}, without regard to conflict-of-law rules.`
            : 'The governing law is not chosen yet. Add it in config/legal.ts before publishing these terms.'}
          {' '}
          If you are a consumer living in the EEA or the UK, you keep the mandatory
          protections of the country where you live, and you may bring proceedings in
          the courts of that country.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <LegalContact />
        <p>
          The privacy policy describes the providers that receive personal data. These
          terms limit what we owe if the service or its output disappoints you. They do
          not shorten rights a statute says we cannot shorten.
        </p>
        <LegalBackLink />
      </LegalSection>
    </LegalPage>
  )
}
