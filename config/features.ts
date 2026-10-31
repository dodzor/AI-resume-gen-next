/**
 * Each 11-second workflow piece can be turned on or off on its own.
 * false hides that piece. true shows it.
 */
export const features = {
  /** Career record page, header button, and Switch row. */
  careerRecord: false,
  /** Run hostile review, and the review marks on the preview. */
  hostileReview: false,
  /** Show 11-second scan, the graphic-template warning, and the scanner's 11-second read. */
  elevenSecondScan: false,
  /** "More descriptions of the same role" on Target Job. */
  moreRoleDescriptions: false,
  /** Fix shows the note and example. When false, Fix writes the example into the bullet. */
  fixReview: false,
  /** "If you could not defend the sentence..." banner. */
  productRule: false,
  /** Block copy and PDF export while [X] or a stock phrase is still on the resume. */
  exportGuard: false,
  /** Trash button on an application in Switch. A production build always leaves this off. */
  deleteApplication: process.env.NODE_ENV === 'production' ? false : true,
  /** "Discover jobs" in the header, on the landing page, and in the application switcher. */
  discoverJobs: process.env.NODE_ENV === 'production' ? false : true,
  /**
   * Model-call ceilings. They reset with the billing period.
   * Paid covers the 30-day search pass and the monthly plan.
   * -1 is unlimited.
   */
  analyses: {
    free: 8,
    paid: 40,
  },
  rewrites: {
    free: 40,
    paid: 500,
  },
  /** Analyses and rewrites on the usage card. A production build always leaves this off. */
  showAiUsage: process.env.NODE_ENV === 'production' ? false : true,
  /** Usage table at /dev/usage. A production build always leaves this off. */
  usageDashboard: process.env.NODE_ENV === 'production' ? false : true,
}
