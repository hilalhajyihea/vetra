export type WhatsAppVars = {
  name: string;
  farm: string;
  clinic: string;
};

export function fillWhatsAppTemplate(template: string, vars: WhatsAppVars) {
  return template
    .replaceAll("{שם}", vars.name)
    .replaceAll("{חווה}", vars.farm)
    .replaceAll("{קליניקה}", vars.clinic);
}

export function formatVetraNotification(vars: WhatsAppVars, body: string) {
  const update = body.trim() || "—";
  return `שלום ${vars.name || "—"},
להלן עדכון מהווטרינר עבור החווה ${vars.farm || "—"}:

${update}

בברכה,
הווטרינר המטפל`;
}

export function insertPlaceholder(template: string, token: string) {
  if (!template) return token;
  const needsSpace = !/\s$/.test(template);
  return `${template}${needsSpace ? " " : ""}${token}`;
}
