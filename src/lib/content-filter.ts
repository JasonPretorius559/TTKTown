const BLOCKED_TERMS = [
  "fuck", "motherfucker", "shit", "bullshit", "cunt", "bitch", "asshole", "dickhead", "bastard", "whore", "slut",
  "nigger", "nigga", "faggot", "retard", "tranny", "chink", "kike", "spic", "wetback", "coon"
];

const BLOCKED_PHRASES = ["kill yourself", "go die", "i will kill you"];
const BLOCKED_SHORT_FORMS = /(^|[^a-z])(kys|fck)(?=$|[^a-z])/i;
const MODERATED_FIELDS = new Set(["caption", "content", "title", "description", "displayName", "username", "bio", "location", "name", "notes", "details", "purchasedFrom"]);

function normalize(value:string){
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[@4]/g,"a").replace(/[3]/g,"e").replace(/[1!|]/g,"i").replace(/[0]/g,"o").replace(/[5$]/g,"s").replace(/[7+]/g,"t")
    .replace(/([a-z])\1{2,}/g,"$1");
}

function separatedTermPattern(term:string){
  return new RegExp(`(^|[^a-z])${[...term].map(letter=>`${letter}[^a-z]*`).join("").replace(/\[\^a-z\]\*$/,"")}($|[^a-z])`,"i");
}

const BLOCKED_PATTERNS=BLOCKED_TERMS.map(separatedTermPattern);

export function containsOffensiveContent(value:string){
  const text=normalize(value);
  if(BLOCKED_SHORT_FORMS.test(text))return true;
  if(BLOCKED_PHRASES.some(phrase=>text.replace(/[^a-z]+/g," ").trim().includes(phrase)))return true;
  return BLOCKED_PATTERNS.some(pattern=>pattern.test(text));
}

export function assertAppropriateContent(values:Array<string|null|undefined>){
  if(values.some(value=>typeof value==="string"&&containsOffensiveContent(value))){
    throw new Error("Please remove offensive or abusive language before submitting.");
  }
}

export function assertRecordContent(value:Record<string,unknown>){
  const text=Object.entries(value).filter(([field,item])=>MODERATED_FIELDS.has(field)&&typeof item==="string").map(([,item])=>item as string);
  assertAppropriateContent(text);
}
