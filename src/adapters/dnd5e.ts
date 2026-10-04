import type { Adapter } from "./index";

export const dnd5e: Adapter = {
  async use(doc, { actor, event }) {
    if (doc.documentName === "Macro") {
      await doc.execute({ actor, token: actor.getActiveTokens?.()[0] });
      return;
    }
    await doc.use({ event }, { event });
  },
  cost(doc) {
    const label = doc.labels?.activation;
    return typeof label === "string" && label ? label : null;
  }
};