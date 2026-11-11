/** Types minimaux de pa11y (le paquet n'en fournit pas), limités à `scripts/a11y.ts`. */
declare module "pa11y" {
  type Pa11yIssue = {
    code: string
    type: "error" | "warning" | "notice"
    message: string
    selector: string
  }
  type Pa11yOptions = {
    standard?: "WCAG2A" | "WCAG2AA" | "WCAG2AAA"
    actions?: string[]
    timeout?: number
  }
  const pa11y: (
    url: string,
    options?: Pa11yOptions
  ) => Promise<{
    pageUrl: string
    documentTitle: string
    issues: Pa11yIssue[]
  }>
  export default pa11y
}
