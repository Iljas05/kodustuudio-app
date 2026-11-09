// Date formatting in Estonian.
const timeFormat = new Intl.DateTimeFormat("et-EE", { hour: "2-digit", minute: "2-digit" });
const dateTimeFormat = new Intl.DateTimeFormat("et-EE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("et-EE", { day: "numeric", month: "short" });

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

/** "14:05" for today's messages, "9. nov 14:05" for older ones. */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return isToday(date) ? timeFormat.format(date) : dateTimeFormat.format(date);
}

/** "14:05" for today, "9. nov" otherwise. Used in the conversation list. */
export function formatListDate(iso: string): string {
  const date = new Date(iso);
  return isToday(date) ? timeFormat.format(date) : dateFormat.format(date);
}
