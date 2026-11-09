/** Short creator-selectable dedications. They are suggestions, never generated claims about a relationship. */
export function openingMessageIdeas(recipientName: string, occasion: string): string[] {
  const name = recipientName.trim() || "you";
  const occasionLines: Record<string, string> = {
    Birthday: "For today, and all the days you deserve to feel celebrated.",
    Anniversary: "For the moments behind us, and every moment still ahead.",
    Wedding: "For the beginning of a beautiful new chapter.",
    "New Baby": "For the day everything changed, and all the love still to come.",
    "Mother's Day": "For the countless little ways you make the world feel like home.",
    "Father's Day": "For the things you taught me that I'll carry forever.",
    Graduation: "For how far you've come, and everything waiting ahead.",
    "Thank You": "Some thank-yous are too meaningful to fit in a card.",
    Milestone: "For this moment, and everything it took to get here.",
    "Family Memories": "For the ordinary moments that became our favorite memories.",
    "Just Because": "The things that matter most don't always need an occasion.",
    "Celebration of Life": "For the love and stories that will always stay with us.",
  };
  return [
    occasionLines[occasion] ?? "Some things are too important to leave unsaid.",
    `${name}, I made this so you can come back to these words, whenever you want.`,
    "A few words in my own voice, made for you to keep forever.",
  ].map(line => line.slice(0, 160));
}
