import {
  filterBlockingFindings,
  hasBlockingFindings,
} from "./runtime-integrity-env"

export type IntegrityRiskLevel = "critical" | "high" | "medium"

export type IntegrityFindingCode =
  | "native_api_tampered"
  | "extension_resource"
  | "foreign_script_injected"
  | "automation_global"
  | "injection_dom_root"
  | "suspicious_iframe"
  | "csp_violation"
  | "prototype_pollution"

export interface IntegrityFinding {
  code: IntegrityFindingCode
  level: IntegrityRiskLevel
  message: string
  detail?: string
  fingerprint: string
}

export interface IntegrityScanResult {
  findings: IntegrityFinding[]
  blocked: boolean
}

const AUTOMATION_GLOBALS = [
  "__nightmare",
  "__puppeteer",
  "__playwright",
  "__selenium",
  "__webdriver",
  "_Selenium_IDE_Recorder",
  "callPhantom",
  "_phantom",
  "domAutomation",
  "domAutomationController",
] as const

const INJECTION_DOM_SELECTORS = [
  "[data-grammarly-shadow-root]",
  "[data-magic-drawing]",
  "#monica-content-root",
  "#chatgpt-sidebar",
  "[class*='grammarly-']",
  "[id*='honey-extension']",
  "[class*='honey-extension']",
  "[data-extension-id]",
  "[data-ext-id]",
] as const

const INJECTION_DOM_ATTRIBUTES: Array<{ attr: string; pattern: RegExp }> = [
  { attr: "data-new-gr-c-s-check-loaded", pattern: /.+/ },
  { attr: "data-gr-ext-installed", pattern: /.+/ },
  { attr: "data-lt-installed", pattern: /.+/ },
  { attr: "data-darkreader-mode", pattern: /.+/ },
  { attr: "data-darkreader-scheme", pattern: /.+/ },
]

const CRITICAL_NATIVE_APIS: Array<keyof typeof globalThis | string> = [
  "fetch",
  "XMLHttpRequest",
  "Function",
  "Object",
  "Array",
  "JSON",
]

function isNativeFunction(fn: unknown): boolean {
  if (typeof fn !== "function") return true
  try {
    return Function.prototype.toString.call(fn).includes("[native code]")
  } catch {
    return false
  }
}

function fingerprint(code: IntegrityFindingCode, detail?: string): string {
  const normalized = (detail ?? "").slice(0, 120).toLowerCase()
  return `${code}:${normalized}`
}

function finding(
  code: IntegrityFindingCode,
  level: IntegrityRiskLevel,
  message: string,
  detail?: string
): IntegrityFinding {
  return { code, level, message, detail, fingerprint: fingerprint(code, detail ?? message) }
}

export function detectNativeApiTampering(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []

  for (const name of CRITICAL_NATIVE_APIS) {
    const value = (globalThis as Record<string, unknown>)[name]
    if (value == null) continue

    if (name === "XMLHttpRequest" && typeof XMLHttpRequest === "function") {
      if (!isNativeFunction(XMLHttpRequest.prototype.open)) {
        findings.push(
          finding(
            "native_api_tampered",
            "critical",
            "Se detectó manipulación de XMLHttpRequest",
            "XMLHttpRequest.prototype.open"
          )
        )
      }
      if (!isNativeFunction(XMLHttpRequest.prototype.send)) {
        findings.push(
          finding(
            "native_api_tampered",
            "critical",
            "Se detectó manipulación de XMLHttpRequest",
            "XMLHttpRequest.prototype.send"
          )
        )
      }
      continue
    }

    if (typeof value === "function" && !isNativeFunction(value)) {
      findings.push(
        finding(
          "native_api_tampered",
          "critical",
          "Se detectó manipulación de APIs nativas del navegador",
          String(name)
        )
      )
    }
  }

  if (!isNativeFunction(Function.prototype.toString)) {
    findings.push(
      finding(
        "native_api_tampered",
        "critical",
        "Function.prototype.toString fue alterado",
        "Function.prototype.toString"
      )
    )
  }

  return findings
}

export function detectAutomationGlobals(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []
  const scope = globalThis as Record<string, unknown>

  for (const key of AUTOMATION_GLOBALS) {
    if (scope[key] != null) {
      findings.push(
        finding(
          "automation_global",
          "critical",
          "Entorno de automatización o scraping detectado",
          key
        )
      )
    }
  }

  if (navigator.webdriver) {
    findings.push(
      finding(
        "automation_global",
        "critical",
        "Navigator indica control automatizado (webdriver)",
        "navigator.webdriver"
      )
    )
  }

  return findings
}

export function detectPrototypePollution(): IntegrityFinding[] {
  const suspiciousKeys = ["polluted", "__proto__", "constructor"]
  for (const key of suspiciousKeys) {
    if (Object.prototype.hasOwnProperty.call(Object.prototype, key)) {
      return [
        finding(
          "prototype_pollution",
          "critical",
          "Posible contaminación del prototipo Object",
          key
        ),
      ]
    }
  }
  return []
}

function isAllowedScriptSrc(src: string, appOrigin: string): boolean {
  if (!src) return true
  if (src.startsWith(appOrigin)) return true
  if (src.startsWith("/")) return true
  if (src.startsWith("blob:")) return true
  if (import.meta.env.DEV && src.includes("/@vite/")) return true
  if (import.meta.env.DEV && src.includes("/@react-refresh")) return true
  return false
}

export function detectForeignScripts(appOrigin = window.location.origin): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []

  document.querySelectorAll("script[src]").forEach((node) => {
    const src = node.getAttribute("src") ?? ""
    if (/^(chrome|moz|safari|ms-browser)-extension:/i.test(src)) {
      findings.push(
        finding(
          "extension_resource",
          "critical",
          "Script de extensión del navegador inyectado en la página",
          src
        )
      )
      return
    }
    if (!isAllowedScriptSrc(src, appOrigin)) {
      findings.push(
        finding(
          "foreign_script_injected",
          "high",
          "Script externo no autorizado en el DOM",
          src
        )
      )
    }
  })

  return findings
}

export function detectInjectionDomRoots(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []

  for (const selector of INJECTION_DOM_SELECTORS) {
    const match = document.querySelector(selector)
    if (match) {
      findings.push(
        finding(
          "injection_dom_root",
          "high",
          "Contenedor DOM de extensión con inyección JavaScript detectado",
          selector
        )
      )
    }
  }

  const root = document.documentElement
  for (const { attr, pattern } of INJECTION_DOM_ATTRIBUTES) {
    const value = root.getAttribute(attr)
    if (value && pattern.test(value)) {
      findings.push(
        finding(
          "injection_dom_root",
          "high",
          "Atributo de extensión inyectado en el documento",
          attr
        )
      )
    }
  }

  return findings
}

export function detectSuspiciousIframes(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []

  document.querySelectorAll("iframe").forEach((iframe) => {
    const src = iframe.getAttribute("src") ?? ""
    if (/^(chrome|moz|safari|ms-browser)-extension:/i.test(src)) {
      findings.push(
        finding(
          "suspicious_iframe",
          "high",
          "Iframe de extensión incrustado en la aplicación",
          src
        )
      )
    }
  })

  return findings
}

export function parseCspViolation(event: SecurityPolicyViolationEvent): IntegrityFinding | null {
  const blocked = event.blockedURI ?? ""
  const source = event.sourceFile ?? ""

  if (
    /^(chrome|moz|safari|ms-browser)-extension:/i.test(blocked) ||
    /^(chrome|moz|safari|ms-browser)-extension:/i.test(source)
  ) {
    return finding(
      "csp_violation",
      "critical",
      "Violación CSP por script de extensión del navegador",
      blocked || source
    )
  }

  if (blocked && !blocked.startsWith(window.location.origin) && blocked !== "inline") {
    return finding(
      "csp_violation",
      "high",
      "Violación de política de seguridad de contenido",
      `${event.violatedDirective}: ${blocked}`
    )
  }

  return null
}

export function runIntegrityScan(): IntegrityScanResult {
  const findings = dedupeFindings([
    ...detectNativeApiTampering(),
    ...detectAutomationGlobals(),
    ...detectPrototypePollution(),
    ...detectForeignScripts(),
    ...detectInjectionDomRoots(),
    ...detectSuspiciousIframes(),
  ])

  const blocked = hasBlockingFindings(findings)
  return { findings, blocked }
}

export function dedupeFindings(findings: IntegrityFinding[]): IntegrityFinding[] {
  const seen = new Set<string>()
  return findings.filter((item) => {
    if (seen.has(item.fingerprint)) return false
    seen.add(item.fingerprint)
    return true
  })
}

export function mergeIntegrityResults(
  current: IntegrityScanResult,
  incoming: IntegrityScanResult
): IntegrityScanResult {
  const findings = dedupeFindings([...current.findings, ...incoming.findings])
  return {
    findings,
    blocked: hasBlockingFindings(findings),
  }
}

export interface IntegrityMonitorOptions {
  intervalMs?: number
  onResult: (result: IntegrityScanResult) => void
}

export function startIntegrityMonitor(options: IntegrityMonitorOptions): () => void {
  const intervalMs = options.intervalMs ?? 4000
  let stopped = false

  const emit = () => {
    if (stopped) return
    options.onResult(runIntegrityScan())
  }

  emit()

  const intervalId = window.setInterval(emit, intervalMs)

  const observer = new MutationObserver((mutations) => {
    if (stopped) return
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        if (node.tagName === "SCRIPT" || node.querySelector("script")) {
          emit()
        }
        if (node.tagName === "IFRAME" || node.querySelector("iframe")) {
          emit()
        }
      })
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: INJECTION_DOM_ATTRIBUTES.map((item) => item.attr),
  })

  function onCspViolation(event: Event) {
    if (stopped) return
    const parsed = parseCspViolation(event as SecurityPolicyViolationEvent)
    if (!parsed) return
    options.onResult({
      findings: [parsed],
      blocked: hasBlockingFindings([parsed]),
    })
  }

  document.addEventListener("securitypolicyviolation", onCspViolation)

  return () => {
    stopped = true
    window.clearInterval(intervalId)
    observer.disconnect()
    document.removeEventListener("securitypolicyviolation", onCspViolation)
  }
}
