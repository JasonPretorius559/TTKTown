const POKEMON_TCG_WIKI_SOURCE = "POKEMON_TCG_WIKI";
const POKEMON_TCG_WIKI_HOST = "pokemon.fandom.com";
const FANDOM_IMAGE_HOST = "static.wikia.nocookie.net";

function configuredValues(name: string) {
  return (process.env[name] || "").split(",").map(value => value.trim()).filter(Boolean);
}

export function approvedCatalogueSources() {
  return new Set([POKEMON_TCG_WIKI_SOURCE, ...configuredValues("CATALOGUE_APPROVED_SOURCES")]);
}

export function catalogueSourceHosts() {
  return new Set([POKEMON_TCG_WIKI_HOST, ...configuredValues("CATALOGUE_SOURCE_HOSTS").map(value => value.toLowerCase())]);
}

export function catalogueImageHosts() {
  return new Set([FANDOM_IMAGE_HOST, ...configuredValues("CATALOGUE_IMAGE_HOSTS").map(value => value.toLowerCase())]);
}
