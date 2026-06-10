import { PROJECTS, EMPLOYMENT, STACK, LOCALES, CERTS, EDUCATION, CONTACT } from './data/content'

export function renderFallback(ui: HTMLElement): void {
  const emp = EMPLOYMENT.map((e) => `<div class="d-emp"><strong>${e.company}</strong><span>${e.role}</span><em>${e.period}</em></div>`).join('')
  const projs = PROJECTS.map((p) => `
    <div class="d-job">
      <div class="d-job__h"><strong>${p.name}</strong><span>${p.company} · ${p.role}</span><em>${p.period}</em></div>
      <ul>${p.points.map((l) => `<li>${l}</li>`).join('')}</ul>
      <div class="d-stack">${p.skills.join(' · ')}</div>
    </div>`).join('')
  const stackAll = Object.entries(STACK).map(([k, v]) => `<div><b>${k}</b> ${v.join(' · ')}</div>`).join('')
  const wrap = document.createElement('div')
  wrap.className = 'dossier is-open is-static'
  wrap.innerHTML = `
    <div class="d-inner">
      <h1>NIKI SUKIASYAN</h1>
      <p class="d-role">Full-Stack Developer · Tbilisi, Georgia · 5+ years</p>
      <p class="d-contact">${CONTACT.email} · ${CONTACT.phone} · ${CONTACT.linkedin} · ${CONTACT.github}</p>
      <p class="d-bio">${CONTACT.bio}</p>
      <h2>Employment</h2><div class="d-emps">${emp}</div>
      <h2>Selected Projects</h2>${projs}
      <h2>Stack</h2><div class="d-stackgrid">${stackAll}</div>
      <h2>Languages</h2><p>${LOCALES.map((l) => `${l.en} (${l.native})`).join(' · ')}</p>
      <h2>Certifications</h2><p>${CERTS.map((c) => `${c.name} — ${c.issuer}, ${c.date}`).join('<br>')}</p>
      <h2>Education</h2><p>${EDUCATION.degree} — ${EDUCATION.school}, ${EDUCATION.period}</p>
    </div>`
  ui.appendChild(wrap)
}
