/**
 * The home screen's salutation, a different one on each load. Each comes in two forms: with the name from
 * Settings, and without one.
 */
// Plain ones just add ", [name]" when a name is set.
const comma = (plain: string) => ({ named: (n: string) => `${plain}, ${n}`, plain });

const GREETINGS: { named: (name: string) => string; plain: string }[] = [
  comma("Hello"),
  { named: (n) => `Greetings, ${n}!`, plain: "Greetings!" },
  { named: (n) => `Salutations, ${n}.`, plain: "Salutations." },
  { named: (n) => `Hey there, ${n}`, plain: "Hey there, stranger" },
  comma("Hi there"),
  comma("Good to see you"),
  comma("Welcome back"),
  comma("Howdy"),
  { named: (n) => `Ahoy, ${n}!`, plain: "Ahoy!" },
  { named: (n) => `Well met, ${n}.`, plain: "Well met." },
  comma("Hiya"),
  { named: (n) => `Bonjour, ${n}`, plain: "Bonjour" },
];

export function greeting(name: string, random: () => number = Math.random): string {
  const g = GREETINGS[Math.floor(random() * GREETINGS.length) % GREETINGS.length];
  const trimmed = name.trim();
  return trimmed ? g.named(trimmed) : g.plain;
}
